<?php

return [
    /*
    |--------------------------------------------------------------------------
    | Deploy Branch
    |--------------------------------------------------------------------------
    |
    | The git branch that triggers auto-deployment when pushed.
    |
    */
    'branch' => env('DEPLOY_BRANCH', 'main'),

    /*
    |--------------------------------------------------------------------------
    | GitHub Webhook Secret
    |--------------------------------------------------------------------------
    |
    | The secret key used to verify GitHub webhook signatures.
    | Generate one at: https://github.com/settings/hooks
    |
    */
    'webhook_secret' => env('DEPLOY_WEBHOOK_SECRET'),

    /*
    |--------------------------------------------------------------------------
    | Deploy Script Path
    |--------------------------------------------------------------------------
    |
    | Path to the deployment script.
    |
    */
    'script_path' => env('DEPLOY_SCRIPT_PATH', base_path('deploy.sh')),
];
