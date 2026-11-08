<?php

namespace App\Http\Controllers;

use App\Jobs\ProcessBackgroundJob;
use App\Models\BackgroundJob;
use App\Models\Booking;
use App\Models\Customer;
use App\Models\Service;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Validator;
use Illuminate\Support\Str;
use Illuminate\Validation\Rule;
use Illuminate\Validation\ValidationException;

class ApiController extends Controller
{
    private const TIMES = ['09:00', '10:00', '11:00', '13:00', '14:00', '15:00', '16:00', '17:00'];
    private const STATUSES = ['PENDING', 'PROCESSING', 'COMPLETED', 'FAILED'];

    private function actor(Request $request): string
    {
        return (string) $request->attributes->get('actor_email');
    }

    private function isAdmin(Request $request): bool
    {
        return $request->attributes->get('actor_role') === 'admin';
    }

    private function adminError(Request $request): ?JsonResponse
    {
        return $this->isAdmin($request) ? null : response()->json(['error' => 'Admin access required'], 403);
    }

    private function invalid(ValidationException $exception): JsonResponse
    {
        return response()->json(['error' => $exception->validator->errors()->first()], 400);
    }

    private function validateInput(Request $request, array $rules): array
    {
        return Validator::make($request->all(), $rules)->validate();
    }

    private function serviceData(Service $service): array
    {
        return [
            'id' => $service->id, 'slug' => $service->slug,
            'name' => $service->name, 'description' => $service->description,
            'category' => $service->category, 'durationMinutes' => $service->duration_minutes,
            'price' => $service->price, 'color' => $service->color, 'active' => $service->active,
            'createdAt' => $service->created_at?->toISOString(),
            '_count' => ['bookings' => $service->bookings_count ?? $service->bookings()->count()],
        ];
    }

    private function customerData(Customer $customer): array
    {
        return [
            'id' => $customer->id, 'name' => $customer->name,
            'email' => $customer->email, 'phone' => $customer->phone,
        ];
    }

    private function bookingData(Booking $booking): array
    {
        $booking->loadMissing(['service', 'customer']);
        return [
            'id' => $booking->id, 'reference' => $booking->reference,
            'serviceId' => $booking->service_id, 'customerId' => $booking->customer_id,
            'date' => $booking->date, 'timeSlot' => $booking->time_slot,
            'status' => $booking->status, 'notes' => $booking->notes,
            'createdBy' => $booking->created_by,
            'createdAt' => $booking->created_at?->toISOString(),
            'updatedAt' => $booking->updated_at?->toISOString(),
            'service' => $this->serviceData($booking->service),
            'customer' => $this->customerData($booking->customer),
        ];
    }

    private function jobData(BackgroundJob $job): array
    {
        $job->loadMissing('booking');
        return [
            'id' => $job->id, 'type' => $job->type,
            'bookingId' => $job->booking_id, 'booking' => $job->booking
                ? ['reference' => $job->booking->reference] : null,
            'status' => $job->status, 'attempts' => $job->attempts,
            'maxAttempts' => $job->max_attempts, 'failUntilAttempt' => $job->fail_until_attempt,
            'lastError' => $job->last_error, 'result' => $job->result,
            'completedAt' => $job->completed_at?->toISOString(),
            'createdAt' => $job->created_at?->toISOString(),
        ];
    }

    private function serviceRules(bool $partial = false): array
    {
        $p = $partial ? 'sometimes|' : 'required|';
        return [
            'name' => $p.'string|min:2|max:80',
            'description' => $p.'string|min:5|max:300',
            'category' => [$partial ? 'sometimes' : 'required', Rule::in(['Consultation', 'Wellness', 'Coaching'])],
            'durationMinutes' => $p.'integer|between:15,240',
            'price' => $p.'integer|min:1',
            'color' => [$partial ? 'sometimes' : 'required', Rule::in(['indigo', 'rose', 'amber', 'cyan', 'emerald', 'violet'])],
            'active' => $p.'boolean',
        ];
    }

    private function serviceAttributes(array $input): array
    {
        $mapping = ['durationMinutes' => 'duration_minutes'];
        $result = [];
        foreach ($input as $key => $value) {
            $result[$mapping[$key] ?? $key] = $value;
        }
        return $result;
    }

    public function health(): JsonResponse
    {
        try {
            Service::query()->count();
            $dbPath = (string) config('database.connections.sqlite.database');
            return response()->json([
                'status' => 'ok',
                'database' => str_contains($dbPath, 'test.sqlite') ? 'test' : 'dev',
            ]);
        } catch (\Throwable) {
            return response()->json(['status' => 'error'], 503);
        }
    }

    public function services(Request $request): JsonResponse
    {
        $page = max(1, (int) $request->query('page', 1));
        $size = max(1, min(50, (int) $request->query('limit', 6)));
        $search = trim((string) $request->query('search', ''));
        $category = (string) $request->query('category', '');
        $query = Service::query()->withCount('bookings');
        if ($search !== '') {
            $query->where(fn ($q) => $q->where('name', 'like', "%{$search}%")
                ->orWhere('description', 'like', "%{$search}%"));
        }
        if ($category !== '' && $category !== 'All') $query->where('category', $category);
        if (!$this->isAdmin($request) || $request->query('active') === 'true') {
            $query->where('active', true);
        }
        $total = (clone $query)->count();
        $items = $query->orderBy('created_at')->orderBy('id')->skip(($page - 1) * $size)
            ->take($size)->get()->map(fn (Service $service) => $this->serviceData($service));
        return response()->json(['items' => $items, 'total' => $total, 'page' => $page, 'pageSize' => $size]);
    }

    public function createService(Request $request): JsonResponse
    {
        if ($denied = $this->adminError($request)) return $denied;
        try {
            $input = $this->validateInput($request, $this->serviceRules());
        } catch (ValidationException $e) { return $this->invalid($e); }
        $input['slug'] = Str::slug($input['name']).'-'.Str::lower(Str::random(8));
        $service = Service::create($this->serviceAttributes($input));
        return response()->json($this->serviceData($service), 201);
    }

    public function updateService(Request $request, string $id): JsonResponse
    {
        if ($denied = $this->adminError($request)) return $denied;
        if (!ctype_digit($id) || (int) $id < 1) return response()->json(['error' => 'Invalid service'], 400);
        $service = Service::find($id);
        if (!$service) return response()->json(['error' => 'Service not found'], 404);
        try {
            $input = $this->validateInput($request, $this->serviceRules(true));
        } catch (ValidationException $e) { return $this->invalid($e); }
        $service->update($this->serviceAttributes($input));
        return response()->json($this->serviceData($service->refresh()));
    }

    public function archiveService(Request $request, string $id): JsonResponse
    {
        if ($denied = $this->adminError($request)) return $denied;
        if (!ctype_digit($id) || (int) $id < 1) return response()->json(['error' => 'Invalid service'], 400);
        $service = Service::find($id);
        if (!$service) return response()->json(['error' => 'Service not found'], 404);
        $service->update(['active' => false]);
        return response()->json(['success' => true]);
    }

    public function bookings(Request $request): JsonResponse
    {
        $page = max(1, (int) $request->query('page', 1));
        $search = trim((string) $request->query('search', ''));
        $status = (string) $request->query('status', '');
        $sort = $request->query('sort') === 'oldest' ? 'asc' : 'desc';
        $query = Booking::query()->with(['customer', 'service']);
        if ($search !== '') {
            $query->where(fn ($q) => $q->where('reference', 'like', "%{$search}%")
                ->orWhereHas('customer', fn ($c) => $c->where('name', 'like', "%{$search}%"))
                ->orWhereHas('service', fn ($s) => $s->where('name', 'like', "%{$search}%")));
        }
        if ($status !== '' && $status !== 'All') $query->where('status', $status);
        $total = (clone $query)->count();
        $items = $query->orderBy('created_at', $sort)->orderBy('id', $sort)
            ->skip(($page - 1) * 8)->take(8)->get()
            ->map(fn (Booking $booking) => $this->bookingData($booking));
        return response()->json(['items' => $items, 'total' => $total, 'page' => $page, 'pageSize' => 8]);
    }

    public function createBooking(Request $request): JsonResponse
    {
        try {
            $data = $this->validateInput($request, [
                'serviceId' => 'required|integer|min:1',
                'date' => 'required|date_format:Y-m-d|after_or_equal:today',
                'timeSlot' => ['required', Rule::in(self::TIMES)],
                'customerName' => 'required|string|min:2|max:100',
                'customerEmail' => 'required|email|max:255',
                'customerPhone' => 'required|string|min:8|max:20',
                'notes' => 'sometimes|nullable|string|max:500',
            ]);
        } catch (ValidationException $e) { return $this->invalid($e); }

        try {
            $booking = DB::transaction(function () use ($data, $request): Booking {
                $service = Service::find($data['serviceId']);
                if (!$service || !$service->active) {
                    throw new \DomainException('The selected service is unavailable.');
                }
                if (Booking::where('service_id', $service->id)->where('date', $data['date'])
                    ->where('time_slot', $data['timeSlot'])->where('status', '!=', 'CANCELED')->exists()) {
                    throw new \LogicException('This time is already booked. Choose another slot.');
                }
                $customer = Customer::updateOrCreate(
                    ['email' => $data['customerEmail']],
                    ['name' => $data['customerName'], 'phone' => $data['customerPhone']]
                );
                $booking = Booking::create([
                    'reference' => 'BK-'.strtoupper(bin2hex(random_bytes(4))),
                    'service_id' => $service->id, 'customer_id' => $customer->id,
                    'date' => $data['date'], 'time_slot' => $data['timeSlot'],
                    'notes' => $data['notes'] ?? '', 'created_by' => $this->actor($request),
                ]);
                $job = BackgroundJob::create(['type' => 'BOOKING_CONFIRMATION', 'booking_id' => $booking->id]);
                // Database queue INSERT and booking INSERT participate in the same SQLite transaction.
                ProcessBackgroundJob::dispatch($job->id);
                return $booking->load(['customer', 'service']);
            });
            return response()->json($this->bookingData($booking), 201);
        } catch (\DomainException $e) {
            return response()->json(['error' => $e->getMessage()], 400);
        } catch (\LogicException $e) {
            return response()->json(['error' => $e->getMessage()], 409);
        }
    }

    public function changeBooking(Request $request, string $id): JsonResponse
    {
        if (!ctype_digit($id) || (int) $id < 1) return response()->json(['error' => 'Invalid booking'], 400);
        try {
            $data = $this->validateInput($request, ['status' => ['required', Rule::in(['CONFIRMED', 'COMPLETED', 'CANCELED'])]]);
        } catch (ValidationException $e) { return $this->invalid($e); }
        $booking = Booking::find($id);
        if (!$booking) return response()->json(['error' => 'Booking not found'], 404);
        if ($booking->status !== $data['status'] && $booking->status !== 'CONFIRMED') {
            return response()->json(['error' => 'This booking can no longer change status'], 409);
        }
        $booking->update(['status' => $data['status']]);
        return response()->json($this->bookingData($booking->refresh()));
    }

    public function availability(Request $request): JsonResponse
    {
        try {
            $data = Validator::make($request->query(), [
                'serviceId' => 'required|integer|min:1',
                'date' => 'required|date_format:Y-m-d',
            ])->validate();
        } catch (ValidationException $e) { return $this->invalid($e); }
        $booked = Booking::where('service_id', $data['serviceId'])->where('date', $data['date'])
            ->where('status', '!=', 'CANCELED')->pluck('time_slot');
        return response()->json(['booked' => $booked]);
    }

    public function dashboard(): JsonResponse
    {
        return response()->json([
            'bookings' => Booking::with(['customer', 'service'])->latest('created_at')->orderByDesc('id')
                ->limit(5)->get()->map(fn (Booking $b) => $this->bookingData($b)),
            'totalBookings' => Booking::count(),
            'upcoming' => Booking::where('status', 'CONFIRMED')->where('date', '>=', now()->toDateString())->count(),
            'activeServices' => Service::where('active', true)->count(),
            'clients' => Customer::count(),
        ]);
    }

    public function queue(Request $request): JsonResponse
    {
        if ($denied = $this->adminError($request)) return $denied;
        $status = strtoupper((string) $request->query('status', 'ALL'));
        $page = max(1, (int) $request->query('page', 1));
        if (!in_array($status, [...self::STATUSES, 'ALL'], true)) {
            return response()->json(['error' => 'Invalid queue filters'], 400);
        }
        $counts = [];
        foreach (self::STATUSES as $name) $counts[$name] = BackgroundJob::where('status', $name)->count();
        $query = BackgroundJob::with('booking');
        if ($status !== 'ALL') $query->where('status', $status);
        $total = (clone $query)->count();
        $totalPages = max(1, (int) ceil($total / 100));
        $page = min($page, $totalPages);
        $items = $query->latest('created_at')->orderByDesc('id')
            ->skip(($page - 1) * 100)->take(100)->get()
            ->map(fn (BackgroundJob $job) => $this->jobData($job));
        return response()->json(compact('items', 'counts', 'page', 'totalPages', 'total'));
    }

    public function createDemoJob(Request $request): JsonResponse
    {
        if ($denied = $this->adminError($request)) return $denied;
        try {
            $data = $this->validateInput($request, ['scenario' => ['required', Rule::in(['success', 'retry', 'fail'])]]);
        } catch (ValidationException $e) { return $this->invalid($e); }
        $job = DB::transaction(function () use ($data): BackgroundJob {
            $failureCount = ['success' => 0, 'retry' => 2, 'fail' => 3][$data['scenario']];
            $job = BackgroundJob::create(['type' => 'DEMO', 'fail_until_attempt' => $failureCount]);
            ProcessBackgroundJob::dispatch($job->id);
            return $job;
        });
        return response()->json($this->jobData($job), 201);
    }

    public function retryJob(Request $request, string $id): JsonResponse
    {
        if ($denied = $this->adminError($request)) return $denied;
        if (!ctype_digit($id) || (int) $id < 1) return response()->json(['error' => 'Invalid job ID'], 400);
        try {
            $this->validateInput($request, ['action' => ['required', Rule::in(['retry'])]]);
        } catch (ValidationException $e) { return $this->invalid($e); }
        $job = DB::transaction(function () use ($id): ?BackgroundJob {
            $job = BackgroundJob::find($id);
            if (!$job || $job->status !== 'FAILED') return null;
            $job->update([
                'status' => 'PENDING', 'attempts' => 0,
                'fail_until_attempt' => 0, 'last_error' => null,
                'result' => null, 'completed_at' => null,
            ]);
            ProcessBackgroundJob::dispatch($job->id);
            return $job;
        });
        if (!$job) {
            return response()->json(['error' => BackgroundJob::find($id) ? 'Only failed jobs can be retried' : 'Job not found'],
                BackgroundJob::find($id) ? 409 : 404);
        }
        return response()->json($this->jobData($job));
    }
}
