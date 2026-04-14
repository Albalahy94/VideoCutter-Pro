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
            $table->string('url')->nullable()->after('action');
            $table->string('method')->nullable()->after('url');
            $table->text('user_agent')->nullable()->after('method');
            $table->string('browser')->nullable()->after('user_agent');
            $table->string('os')->nullable()->after('browser');
            $table->string('device_type')->nullable()->after('os'); // desktop, mobile, tablet, robot
            $table->string('referer')->nullable()->after('device_type');
            $table->integer('page_load_time')->nullable()->after('referer');
            $table->integer('duration')->nullable()->after('page_load_time');
        });
    }

    /**
     * Reverse the migrations.
     */
    public function down(): void
    {
        Schema::table('analytics_logs', function (Blueprint $table) {
            $table->dropColumn([
                'url', 'method', 'user_agent', 'browser', 'os', 'device_type', 'referer', 'page_load_time', 'duration'
            ]);
        });
    }
};
