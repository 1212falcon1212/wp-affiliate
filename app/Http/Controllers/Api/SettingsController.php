<?php

namespace App\Http\Controllers\Api;

use App\Http\Controllers\Controller;
use App\Models\Setting;
use Illuminate\Http\Request;
use Illuminate\Http\JsonResponse;

class SettingsController extends Controller
{
    /**
     * Get all settings grouped by category
     */
    public function index(): JsonResponse
    {
        $settings = Setting::all();

        $data = [
            'woocommerce' => [],
            'bizimhesap' => [],
            'general' => []
        ];

        foreach ($settings as $setting) {
            if (isset($data[$setting->group])) {
                $data[$setting->group][$setting->key] = $setting->value;
            } else {
                // If group not predefined, add it dynamically or skip
                // For now, let's add it dynamically to be safe
                if (!isset($data[$setting->group])) {
                    $data[$setting->group] = [];
                }
                $data[$setting->group][$setting->key] = $setting->value;
            }
        }

        return response()->json(['data' => $data]);
    }

    /**
     * Save settings
     */
    public function store(Request $request): JsonResponse
    {
        $validated = $request->validate([
            'woocommerce' => 'nullable|array',
            'bizimhesap' => 'nullable|array',
            'general' => 'nullable|array',
        ]);

        // Save WooCommerce Settings
        if (!empty($validated['woocommerce'])) {
            foreach ($validated['woocommerce'] as $key => $value) {
                Setting::updateOrCreate(
                    ['key' => $key, 'group' => 'woocommerce'],
                    ['value' => $value]
                );
            }
        }

        // Save BizimHesap Settings
        if (!empty($validated['bizimhesap'])) {
            foreach ($validated['bizimhesap'] as $key => $value) {
                Setting::updateOrCreate(
                    ['key' => $key, 'group' => 'bizimhesap'],
                    ['value' => $value]
                );
            }
        }

        // Save General Settings
        if (!empty($validated['general'])) {
            foreach ($validated['general'] as $key => $value) {
                Setting::updateOrCreate(
                    ['key' => $key, 'group' => 'general'],
                    ['value' => $value]
                );
            }
        }

        return response()->json([
            'success' => true,
            'message' => 'Ayarlar başarıyla kaydedildi'
        ]);
    }
}
