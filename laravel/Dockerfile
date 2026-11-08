FROM dunglas/frankenphp:1-php8.4-bookworm

RUN install-php-extensions pdo_mysql pdo_sqlite redis pcntl mbstring intl zip
COPY --from=composer:2 /usr/bin/composer /usr/local/bin/composer

WORKDIR /app
COPY composer.json ./
RUN composer install --no-interaction --prefer-dist --no-scripts --no-progress
COPY . .
RUN composer dump-autoload --optimize && \
    mkdir -p storage/framework/cache storage/framework/sessions storage/framework/views storage/logs bootstrap/cache && \
    chown -R www-data:www-data storage bootstrap/cache

ENV SERVER_NAME=:80
EXPOSE 80
