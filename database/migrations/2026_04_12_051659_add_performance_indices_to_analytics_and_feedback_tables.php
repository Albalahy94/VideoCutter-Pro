<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    /**
     * Run the migrations.
     */
    public function up(): void
    {
        Schema::table('analytics_logs', function (Blueprint $table) {
            $table->index('action');
            $table->index('user_id');
            $table->index('country');
            $table->index('device_type');
            $table->index('created_at');
        });

        Schema::table('feedback', function (Blueprint $table) {
            $table->index('rating');
            $table->index('user_id');
            $table->index('created_at');
        });
    }

    /**
     * Reverse the migrations.
     */
    public function down(): void
    {
        Schema::table('analytics_logs', function (Blueprint $table) {
            $table->dropIndex(['action']);
            $table->dropIndex(['user_id']);
            $table->dropIndex(['country']);
            $table->dropIndex(['device_type']);
            $table->dropIndex(['created_at']);
        });

        Schema::table('feedback', function (Blueprint $table) {
            $table->dropIndex(['rating']);
            $table->dropIndex(['user_id']);
            $table->dropIndex(['created_at']);
        });
    }
};
