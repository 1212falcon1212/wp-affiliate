<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;

class AffiliatePayment extends Model
{
    protected $fillable = [
        'affiliate_id',
        'invoice_id',
        'payment_number',
        'amount',
        'currency',
        'payment_method',
        'payment_details',
        'provider_transaction_id',
        'provider_status',
        'provider_response',
        'status',
        'referral_ids',
        'notes',
        'processed_at',
        'completed_at',
    ];

    protected $casts = [
        'amount' => 'decimal:2',
        'payment_details' => 'array',
        'provider_response' => 'array',
        'referral_ids' => 'array',
        'processed_at' => 'datetime',
        'completed_at' => 'datetime',
    ];

    /**
     * Generate unique payment number
     */
    public static function generatePaymentNumber(): string
    {
        $year = date('Y');
        $month = date('m');
        $lastPayment = self::whereYear('created_at', $year)
            ->whereMonth('created_at', $month)
            ->orderBy('id', 'desc')
            ->first();

        $sequence = $lastPayment ? ((int) substr($lastPayment->payment_number, -4)) + 1 : 1;

        return "PAY{$year}{$month}" . str_pad($sequence, 4, '0', STR_PAD_LEFT);
    }

    /**
     * Affiliate relationship
     */
    public function affiliate(): BelongsTo
    {
        return $this->belongsTo(Affiliate::class);
    }

    /**
     * Invoice relationship
     */
    public function invoice(): BelongsTo
    {
        return $this->belongsTo(AffiliateInvoice::class, 'invoice_id');
    }

    /**
     * Get referrals included in this payment
     */
    public function getReferrals()
    {
        if (empty($this->referral_ids)) {
            return collect();
        }

        return AffiliateReferral::whereIn('id', $this->referral_ids)->get();
    }

    /**
     * Mark as completed
     */
    public function markAsCompleted(): void
    {
        $this->update([
            'status' => 'completed',
            'completed_at' => now(),
        ]);

        // Mark related referrals as paid
        if (!empty($this->referral_ids)) {
            AffiliateReferral::whereIn('id', $this->referral_ids)
                ->update([
                    'status' => 'paid',
                    'paid_at' => now(),
                ]);
        }

        // Update affiliate stats
        $this->affiliate->updateStats();
    }

    /**
     * Get status label
     */
    public function getStatusLabelAttribute(): string
    {
        return match ($this->status) {
            'pending' => 'Beklemede',
            'processing' => 'Isleniyor',
            'completed' => 'Tamamlandi',
            'failed' => 'Basarisiz',
            'cancelled' => 'Iptal',
            default => $this->status,
        };
    }

    /**
     * Get status color
     */
    public function getStatusColorAttribute(): string
    {
        return match ($this->status) {
            'pending' => 'yellow',
            'processing' => 'blue',
            'completed' => 'green',
            'failed' => 'red',
            'cancelled' => 'gray',
            default => 'gray',
        };
    }

    /**
     * Get payment method label
     */
    public function getPaymentMethodLabelAttribute(): string
    {
        return match ($this->payment_method) {
            'bank_transfer' => 'Banka Transferi',
            'paytr' => 'PayTR',
            'paypal' => 'PayPal',
            'manual' => 'Manuel',
            default => $this->payment_method,
        };
    }
}
