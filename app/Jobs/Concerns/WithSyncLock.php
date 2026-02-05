<?php

namespace App\Jobs\Concerns;

use Illuminate\Support\Facades\Cache;
use Illuminate\Support\Facades\Log;

trait WithSyncLock
{
    /**
     * Get the unique lock key for this job
     */
    abstract protected function getLockKey(): string;

    /**
     * Get lock timeout in seconds (default: 10 minutes)
     */
    protected function getLockTimeout(): int
    {
        return 600;
    }

    /**
     * Acquire lock before processing
     */
    protected function acquireLock(): bool
    {
        $lock = Cache::lock($this->getLockKey(), $this->getLockTimeout());

        if (!$lock->get()) {
            Log::warning("Could not acquire lock for: " . $this->getLockKey());
            return false;
        }

        // Store lock owner for release
        $this->lockOwner = $lock->owner();

        return true;
    }

    /**
     * Release lock after processing
     */
    protected function releaseLock(): void
    {
        $lock = Cache::lock($this->getLockKey());

        if (isset($this->lockOwner)) {
            Cache::restoreLock($this->getLockKey(), $this->lockOwner)->release();
        } else {
            $lock->forceRelease();
        }
    }

    /**
     * Execute with lock protection
     */
    protected function withLock(callable $callback): mixed
    {
        if (!$this->acquireLock()) {
            Log::info("Job skipped - lock already held: " . $this->getLockKey());
            return null;
        }

        try {
            return $callback();
        } finally {
            $this->releaseLock();
        }
    }

    /**
     * Check if lock is available
     */
    protected function isLockAvailable(): bool
    {
        return Cache::lock($this->getLockKey())->get();
    }

    /**
     * Force release a stuck lock (use with caution)
     */
    protected function forceReleaseLock(): void
    {
        Cache::lock($this->getLockKey())->forceRelease();
        Log::warning("Force released lock: " . $this->getLockKey());
    }
}
