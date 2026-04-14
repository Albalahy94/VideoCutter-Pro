<?php
require __DIR__ . '/../vendor/autoload.php';
$app = require_once __DIR__ . '/../bootstrap/app.php';
$kernel = $app->make(Illuminate\Contracts\Console\Kernel::class);
$kernel->bootstrap();

use App\Models\User;

$user = User::where('email', 'owner@example.com')->first();
if ($user) {
    $user->password = '12345678';
    $user->save();
    echo "Password updated successfully for " . $user->email . " in VideoCutter project\n";
} else {
    echo "User owner@example.com not found in VideoCutter project\n";
    // Check all users
    print_r(User::pluck('email')->toArray());
}
