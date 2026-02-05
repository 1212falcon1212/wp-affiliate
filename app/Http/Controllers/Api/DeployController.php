<?php

namespace App\Http\Controllers\Api;

use App\Http\Controllers\Controller;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\Log;
use Illuminate\Support\Facades\Process;

class DeployController extends Controller
{
    /**
     * Handle GitHub webhook for auto-deploy
     */
    public function webhook(Request $request): JsonResponse
    {
        // Verify GitHub signature
        if (!$this->verifyGitHubSignature($request)) {
            Log::warning('Deploy webhook: Invalid signature');
            return response()->json(['error' => 'Invalid signature'], 403);
        }

        // Check if it's a push event
        $event = $request->header('X-GitHub-Event');
        if ($event !== 'push') {
            return response()->json(['message' => "Ignored event: {$event}"]);
        }

        // Check branch
        $payload = $request->all();
        $branch = $payload['ref'] ?? '';
        $allowedBranch = 'refs/heads/' . config('deploy.branch', 'main');

        if ($branch !== $allowedBranch) {
            return response()->json(['message' => "Ignored branch: {$branch}"]);
        }

        // Log deployment
        $pusher = $payload['pusher']['name'] ?? 'unknown';
        $commitMessage = $payload['head_commit']['message'] ?? 'No message';
        Log::info("Deploy triggered by {$pusher}: {$commitMessage}");

        // Run deploy script asynchronously
        $scriptPath = base_path('deploy.sh');

        if (!file_exists($scriptPath)) {
            Log::error('Deploy script not found');
            return response()->json(['error' => 'Deploy script not found'], 500);
        }

        // Execute in background
        Process::timeout(300)->start("bash {$scriptPath} >> " . storage_path('logs/deploy.log') . " 2>&1 &");

        return response()->json([
            'message' => 'Deployment started',
            'branch' => $branch,
            'pusher' => $pusher,
            'commit' => $payload['head_commit']['id'] ?? null,
        ]);
    }

    /**
     * Get deployment status and logs
     */
    public function status(): JsonResponse
    {
        $logFile = storage_path('logs/deploy.log');
        $logs = '';

        if (file_exists($logFile)) {
            // Get last 100 lines
            $logs = $this->tailFile($logFile, 100);
        }

        return response()->json([
            'maintenance_mode' => app()->isDownForMaintenance(),
            'last_deploy_log' => $logs,
            'git_branch' => trim(shell_exec('git rev-parse --abbrev-ref HEAD 2>/dev/null') ?? 'unknown'),
            'git_commit' => trim(shell_exec('git rev-parse --short HEAD 2>/dev/null') ?? 'unknown'),
            'git_date' => trim(shell_exec('git log -1 --format=%ci 2>/dev/null') ?? 'unknown'),
        ]);
    }

    /**
     * Manual deploy trigger (requires auth)
     */
    public function trigger(Request $request): JsonResponse
    {
        $scriptPath = base_path('deploy.sh');

        if (!file_exists($scriptPath)) {
            return response()->json(['error' => 'Deploy script not found'], 500);
        }

        Log::info('Manual deploy triggered by user: ' . ($request->user()?->email ?? 'API'));

        Process::timeout(300)->start("bash {$scriptPath} >> " . storage_path('logs/deploy.log') . " 2>&1 &");

        return response()->json([
            'message' => 'Deployment started manually',
        ]);
    }

    /**
     * Verify GitHub webhook signature
     */
    private function verifyGitHubSignature(Request $request): bool
    {
        $secret = config('deploy.webhook_secret');

        // Skip verification if no secret configured
        if (empty($secret)) {
            Log::warning('Deploy webhook secret not configured - skipping verification');
            return true;
        }

        $signature = $request->header('X-Hub-Signature-256');
        if (!$signature) {
            return false;
        }

        $payload = $request->getContent();
        $expectedSignature = 'sha256=' . hash_hmac('sha256', $payload, $secret);

        return hash_equals($expectedSignature, $signature);
    }

    /**
     * Get last N lines of a file
     */
    private function tailFile(string $filepath, int $lines = 100): string
    {
        $file = new \SplFileObject($filepath, 'r');
        $file->seek(PHP_INT_MAX);
        $totalLines = $file->key();

        $start = max(0, $totalLines - $lines);
        $file->seek($start);

        $output = [];
        while (!$file->eof()) {
            $output[] = $file->fgets();
        }

        return implode('', $output);
    }
}
