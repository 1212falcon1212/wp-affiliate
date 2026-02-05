<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;
use Illuminate\Database\Eloquent\Relations\HasOne;

class AffiliateInvoice extends Model
{
    protected $fillable = [
        'affiliate_id',
        'invoice_number',
        'amount',
        'tax_amount',
        'total_amount',
        'currency',
        'bizimhesap_id',
        'bizimhesap_url',
        'bizimhesap_status',
        'period_start',
        'period_end',
        'referral_ids',
        'status',
        'notes',
        'sent_at',
        'paid_at',
    ];

    protected $casts = [
        'amount' => 'decimal:2',
        'tax_amount' => 'decimal:2',
        'total_amount' => 'decimal:2',
        'referral_ids' => 'array',
        'period_start' => 'date',
        'period_end' => 'date',
        'sent_at' => 'datetime',
        'paid_at' => 'datetime',
    ];

    /**
     * Generate unique invoice number
     */
    public static function generateInvoiceNumber(): string
    {
        $year = date('Y');
        $lastInvoice = self::whereYear('created_at', $year)
            ->orderBy('id', 'desc')
            ->first();

        $sequence = $lastInvoice ? ((int) substr($lastInvoice->invoice_number, -5)) + 1 : 1;

        return "AF{$year}" . str_pad($sequence, 5, '0', STR_PAD_LEFT);
    }

    /**
     * Affiliate relationship
     */
    public function affiliate(): BelongsTo
    {
        return $this->belongsTo(Affiliate::class);
    }

    /**
     * Payment relationship
     */
    public function payment(): HasOne
    {
        return $this->hasOne(AffiliatePayment::class, 'invoice_id');
    }

    /**
     * Get referrals included in this invoice
     */
    public function getReferrals()
    {
        if (empty($this->referral_ids)) {
            return collect();
        }

        return AffiliateReferral::whereIn('id', $this->referral_ids)->get();
    }

    /**
     * Check if invoice is sent to BizimHesap
     */
    public function isSentToBizimHesap(): bool
    {
        return !empty($this->bizimhesap_id);
    }

    /**
     * Get status label
     */
    public function getStatusLabelAttribute(): string
    {
        return match ($this->status) {
            'draft' => 'Taslak',
            'sent' => 'Gonderildi',
            'paid' => 'Odendi',
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
            'draft' => 'gray',
            'sent' => 'blue',
            'paid' => 'green',
            'cancelled' => 'red',
            default => 'gray',
        };
    }
}
