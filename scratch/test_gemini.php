<?php
$key = 'AIzaSyDX7EGq3w5BEfbseiUwT6amCI9E5Y9eQiw';

// List available models for this key
$url = 'https://generativelanguage.googleapis.com/v1beta/models?key=' . $key;

$ch = curl_init($url);
curl_setopt($ch, CURLOPT_RETURNTRANSFER, true);
curl_setopt($ch, CURLOPT_HTTPHEADER, ['Accept: application/json']);
$response = curl_exec($ch);
$status = curl_getinfo($ch, CURLINFO_HTTP_CODE);
curl_close($ch);

echo "STATUS: $status\n";
$data = json_decode($response, true);
if (!empty($data['models'])) {
    echo "Available models that support generateContent:\n";
    foreach ($data['models'] as $model) {
        $supports = $model['supportedGenerationMethods'] ?? [];
        if (in_array('generateContent', $supports)) {
            echo "  - " . $model['name'] . "\n";
        }
    }
} else {
    echo "RESPONSE: " . $response . "\n";
}
