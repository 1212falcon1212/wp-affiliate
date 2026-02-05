<?php

return [

    /*
    |--------------------------------------------------------------------------
    | Third Party Services
    |--------------------------------------------------------------------------
    |
    | This file is for storing the credentials for third party services such
    | as Mailgun, Postmark, AWS and more. This file provides the de facto
    | location for this type of information, allowing packages to have
    | a conventional file to locate the various service credentials.
    |
    */

    'postmark' => [
        'key' => env('POSTMARK_API_KEY'),
    ],

    'resend' => [
        'key' => env('RESEND_API_KEY'),
    ],

    'ses' => [
        'key' => env('AWS_ACCESS_KEY_ID'),
        'secret' => env('AWS_SECRET_ACCESS_KEY'),
        'region' => env('AWS_DEFAULT_REGION', 'us-east-1'),
    ],

    'slack' => [
        'notifications' => [
            'bot_user_oauth_token' => env('SLACK_BOT_USER_OAUTH_TOKEN'),
            'channel' => env('SLACK_BOT_USER_DEFAULT_CHANNEL'),
        ],
    ],

    'woocommerce' => [
        'url' => env('WOOCOMMERCE_STORE_URL'),
        'key' => env('WOOCOMMERCE_CONSUMER_KEY'),
        'secret' => env('WOOCOMMERCE_CONSUMER_SECRET'),
    ],

    'bizimhesap' => [
        'key' => env('BIZIMHESAP_API_KEY'),
        'token' => env('BIZIMHESAP_API_TOKEN'),
        'firm_id' => env('BIZIMHESAP_FIRM_ID'),
        'tax_rate' => env('BIZIMHESAP_TAX_RATE', 20),
    ],

];
