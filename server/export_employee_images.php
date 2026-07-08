<?php
/**
 * Export Employee Avatar + Cover Photo Images from Database
 * 
 * - Always saves as image/jpeg format (converts PNG → JPEG too)
 * - Filename = date & time only (e.g. 2026-06-30_12-28-10.jpeg)
 * - Removes OLD exported images before saving new ones
 * 
 * Folder structure:
 *   uploads/
 *   ├── employee_images/
 *   │   ├── employee1/
 *   │   │   └── 2026-06-30_12-28-10.jpeg   ← NEW (old ones deleted)
 *   └── cover_photo/
 *       ├── employee1/
 *       │   └── 2026-06-30_12-28-10.jpeg   ← NEW (old ones deleted)
 */

// Current date and time for filename
$datetime = date('Y-m-d_H-i-s');

// Database connection
$host     = 'localhost';
$dbname   = 'lms_db';
$username = 'root';
$password = '12345678';

// Base upload directory
$baseDir       = __DIR__ . '/uploads/';
$avatarBaseDir = $baseDir . 'employee_images/';
$coverBaseDir  = $baseDir . 'cover_photo/';

// Create base directories if not existing
foreach ([$avatarBaseDir, $coverBaseDir] as $dir) {
    if (!is_dir($dir)) {
        mkdir($dir, 0755, true);
    }
}

// ─── Helper: delete all old .jpeg/.jpg/.png files from a folder ──────────────
function clearOldImages($folderPath) {
    if (!is_dir($folderPath)) return 0;
    $deleted = 0;
    $files = glob($folderPath . '*.{jpeg,jpg,png,gif,webp}', GLOB_BRACE);
    foreach ($files as $file) {
        if (is_file($file)) {
            unlink($file);
            $deleted++;
        }
    }
    return $deleted;
}

// ─── Helper: convert base64 image → JPEG binary using GD ─────────────────────
function convertToJpeg($base64Data) {
    // Strip data URI header: data:image/jpeg;base64,...
    if (preg_match('/^data:image\/(\w+);base64,/', $base64Data, $matches)) {
        $rawBase64 = substr($base64Data, strpos($base64Data, ',') + 1);
    } else {
        $rawBase64 = $base64Data;
    }

    $rawData = base64_decode($rawBase64);
    if ($rawData === false) return false;

    // Load image into GD (handles jpeg, png, gif, webp)
    $gdImage = @imagecreatefromstring($rawData);
    if ($gdImage === false) {
        // GD failed — return raw data as-is (already jpeg likely)
        return $rawData;
    }

    // Convert to JPEG in memory buffer
    ob_start();
    imagejpeg($gdImage, null, 90); // 90% quality
    $jpegData = ob_get_clean();
    imagedestroy($gdImage);

    return $jpegData;
}

// ─── Helper: save image to folder as JPEG with date-time filename ─────────────
function saveImage($base64Data, $folderPath, $datetime, $employeeNum, $label) {
    // Create employee subfolder
    $empFolder = $folderPath . "employee{$employeeNum}/";
    if (!is_dir($empFolder)) {
        mkdir($empFolder, 0755, true);
    }

    // 1. Remove all old images from this employee's folder
    $removed = clearOldImages($empFolder);
    if ($removed > 0) {
        echo "  🗑️  Removed {$removed} old image(s) from employee{$employeeNum}/\n";
    }

    // 2. Convert to JPEG
    $jpegData = convertToJpeg($base64Data);
    if ($jpegData === false) {
        echo "  ⚠️  Invalid image data — skipped.\n";
        return false;
    }

    // 3. Save as YYYY-MM-DD_HH-MM-SS.jpeg
    $filename = "{$datetime}.jpeg";
    $filepath = $empFolder . $filename;

    if (file_put_contents($filepath, $jpegData) !== false) {
        $size = round(strlen($jpegData) / 1024, 1);
        echo "  ✅ [{$label}] employee{$employeeNum}/{$filename}  ({$size} KB, image/jpeg)\n";
        return true;
    } else {
        echo "  ❌ [{$label}] Failed to write file.\n";
        return false;
    }
}

// ─── Main ─────────────────────────────────────────────────────────────────────
try {
    $pdo = new PDO("mysql:host=$host;dbname=$dbname;charset=utf8", $username, $password);
    $pdo->setAttribute(PDO::ATTR_ERRMODE, PDO::ERRMODE_EXCEPTION);

    // Fetch all employees
    $stmt = $pdo->query("
        SELECT id, employee_id, name, avatar, cover_photo
        FROM users
        ORDER BY id ASC
    ");
    $employees = $stmt->fetchAll(PDO::FETCH_ASSOC);

    if (empty($employees)) {
        echo "❌ No employees found.\n";
        exit;
    }

    $avatarCount = 0;
    $coverCount  = 0;
    $empIndex    = 1;

    foreach ($employees as $employee) {
        $name = $employee['name'] ?? 'Unknown';
        $eid  = $employee['employee_id'] ?? '—';

        echo "\n👤 Employee{$empIndex}: {$name} ({$eid})\n";

        // ── Avatar
        if (!empty($employee['avatar'])) {
            $ok = saveImage($employee['avatar'], $avatarBaseDir, $datetime, $empIndex, 'avatar');
            if ($ok) $avatarCount++;
        } else {
            echo "  — No avatar.\n";
        }

        // ── Cover Photo
        if (!empty($employee['cover_photo'])) {
            $ok = saveImage($employee['cover_photo'], $coverBaseDir, $datetime, $empIndex, 'cover_photo');
            if ($ok) $coverCount++;
        } else {
            echo "  — No cover photo.\n";
        }

        $empIndex++;
    }

    echo "\n";
    echo "══════════════════════════════════════════\n";
    echo "🎉 Export Complete!\n";
    echo "   📸 Avatars saved     : {$avatarCount}  (image/jpeg)\n";
    echo "   🖼️  Cover photos saved: {$coverCount}  (image/jpeg)\n";
    echo "   📁 Location          : {$baseDir}\n";
    echo "══════════════════════════════════════════\n";

} catch (PDOException $e) {
    echo "❌ Database Error: " . $e->getMessage() . "\n";
}
?>
