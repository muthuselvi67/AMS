<?php
/**
 * test_upload.php  — diagnose why profile saves aren't working
 * Access: http://localhost:5000/test_upload.php
 */
header('Content-Type: text/plain');
header('Access-Control-Allow-Origin: *');

echo "=== PHP Upload Diagnostics ===\n\n";

// 1. PHP version
echo "PHP Version: " . PHP_VERSION . "\n";

// 2. GD status
echo "GD Extension: " . (extension_loaded('gd') ? "✅ ENABLED" : "❌ DISABLED") . "\n";

// 3. post_max_size
echo "post_max_size: " . ini_get('post_max_size') . "\n";
echo "upload_max_filesize: " . ini_get('upload_max_filesize') . "\n";
echo "max_input_vars: " . ini_get('max_input_vars') . "\n";
echo "memory_limit: " . ini_get('memory_limit') . "\n";
echo "max_execution_time: " . ini_get('max_execution_time') . "s\n\n";

// 4. Uploads folder writable?
$folders = [
    __DIR__ . '/uploads/',
    __DIR__ . '/uploads/avatars/',
    __DIR__ . '/uploads/cover_photos/',
    __DIR__ . '/uploads/id_cards/',
];
echo "=== Folder Write Permissions ===\n";
foreach ($folders as $folder) {
    if (!is_dir($folder)) mkdir($folder, 0755, true);
    $writable = is_writable($folder);
    echo ($writable ? "✅" : "❌") . " " . $folder . "\n";
}

// 5. Try writing a test file
echo "\n=== Test File Write ===\n";
$testFile = __DIR__ . '/uploads/avatars/_test_write.txt';
$ok = file_put_contents($testFile, 'test') !== false;
echo ($ok ? "✅" : "❌") . " Write test to uploads/avatars/\n";
if ($ok) unlink($testFile);

// 6. Test GD image creation
echo "\n=== GD Image Test ===\n";
if (extension_loaded('gd')) {
    $gd = imagecreatetruecolor(10, 10);
    ob_start();
    imagejpeg($gd, null, 90);
    $jpegData = ob_get_clean();
    imagedestroy($gd);
    echo "✅ GD JPEG output size: " . strlen($jpegData) . " bytes\n";
} else {
    echo "❌ GD not available\n";
}

// 7. If POST request — test image decoding
if ($_SERVER['REQUEST_METHOD'] === 'POST') {
    echo "\n=== POST Body Test ===\n";
    $raw = file_get_contents('php://input');
    echo "Raw input size: " . strlen($raw) . " bytes\n";

    $data = json_decode($raw, true);
    if (!$data) {
        echo "❌ JSON decode failed: " . json_last_error_msg() . "\n";
    } else {
        echo "✅ JSON decoded OK. Keys: " . implode(', ', array_keys($data)) . "\n";
        $avatar = $data['avatar'] ?? null;
        if ($avatar) {
            echo "Avatar field starts with: " . substr($avatar, 0, 50) . "\n";
            echo "Avatar field length: " . strlen($avatar) . " bytes\n";

            if (str_starts_with($avatar, 'data:image/')) {
                $pos    = strpos($avatar, ',');
                $b64    = substr($avatar, $pos + 1);
                $binary = base64_decode($b64, true);
                echo "Base64 decode: " . ($binary ? "✅ " . strlen($binary) . " bytes" : "❌ Failed") . "\n";

                if ($binary && extension_loaded('gd')) {
                    $gd = @imagecreatefromstring($binary);
                    echo "GD load: " . ($gd ? "✅ " . imagesx($gd) . "×" . imagesy($gd) : "❌ Failed") . "\n";
                }

                // Try saving
                $fname  = 'uploads/avatars/Image_' . date('Ymd_His') . '.jpeg';
                $canvas = imagecreatetruecolor(imagesx($gd), imagesy($gd));
                $white  = imagecolorallocate($canvas, 255, 255, 255);
                imagefill($canvas, 0, 0, $white);
                imagecopy($canvas, $gd, 0, 0, 0, 0, imagesx($gd), imagesy($gd));
                ob_start(); imagejpeg($canvas, null, 90); $jpeg = ob_get_clean();
                $saved = file_put_contents(__DIR__ . '/' . $fname, $jpeg);
                echo "File save: " . ($saved !== false ? "✅ Saved to $fname" : "❌ Save failed") . "\n";
            }
        } else {
            echo "No avatar field in POST body.\n";
        }
    }
}

echo "\n=== Done ===\n";
?>
