<?php

namespace App\Http\Middleware;

use Closure;
use Illuminate\Http\Request;
use Symfony\Component\HttpFoundation\Response;

class VerifyFrontendSignature
{
    public function handle(Request $request, Closure $next): Response
    {
        $secret = (string) env('INTERNAL_API_SECRET', '');
        $timestamp = (string) $request->header('X-Frontend-Timestamp', '');
        $email = (string) $request->header('X-Frontend-Identity', '');
        $role = (string) $request->header('X-Frontend-Role', '');
        $signature = (string) $request->header('X-Frontend-Signature', '');

        if (strlen($secret) < 24 || !ctype_digit($timestamp) ||
            abs(time() - (int) $timestamp) > 60 ||
            !filter_var($email, FILTER_VALIDATE_EMAIL) ||
            !in_array($role, ['admin', 'staff'], true) ||
            !preg_match('/^[a-f0-9]{64}$/', $signature)) {
            return response()->json(['error' => 'Unauthorized'], 401);
        }

        $path = '/'.$request->path();
        $query = $request->getQueryString();
        if ($query !== null && $query !== '') {
            $path .= '?'.$query;
        }
        $canonical = implode("\n", [
            $timestamp, $request->method(), $path,
            hash('sha256', $request->getContent()), $email, $role,
        ]);
        $expected = hash_hmac('sha256', $canonical, $secret);
        if (!hash_equals($expected, $signature)) {
            return response()->json(['error' => 'Unauthorized'], 401);
        }

        $request->attributes->set('actor_email', $email);
        $request->attributes->set('actor_role', $role);
        return $next($request);
    }
}
