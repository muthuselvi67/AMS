<?php
/**
 * ══════════════════════════════════════════════════════════════
 *  ConvertDbImagesToJpeg.php
 *
 *  Reads avatar / cover_photo / id_card_photo from the DB,
 *  converts PNG/GIF/WEBP → JPEG (base64 data URI),
 *  then UPDATES the database row with the new JPEG value.
 *
 *  Also saves a copy as:
 *    uploads/converted/Image_YYYY-MM-DD_HH-mm-ss.jpeg
 * ══════════════════════════════════════════════════════════════
 */

// ─── Config ───────────────────────────────────────────────────
$host       = 'localhost';
$dbname     = 'lms_db';
$username   = 'root';
$password   = '12345678';
$outputDir  = __DIR__ . '/uploads/converted/';
$jpegQuality = 90;

// Columns to process
$columns = ['avatar', 'cover_photo', 'id_card_photo'];

// ─── Connect ──────────────────────────────────────────────────
try {
    $pdo = new PDO("mysql:host=$host;dbname=$dbname;charset=utf8", $username, $password);
    $pdo->setAttribute(PDO::ATTR_ERRMODE, PDO::ERRMODE_EXCEPTION);
} catch (PDOException $e) {
    die("❌ DB Connection failed: " . $e->getMessage() . "\n");
}

// ─── Create output dir ────────────────────────────────────────
if (!is_dir($outputDir)) {
    mkdir($outputDir, 0755, true);
}

// ══════════════════════════════════════════════════════════════
//  HELPERS
// ══════════════════════════════════════════════════════════════

/**
 * Decode a DB image value into raw binary.
 * Handles: data URI, plain base64, raw binary BLOB.
 */
function decodeToBinary(string $value): string|false {
    // data:image/xxx;base64,....
    if (str_starts_with($value, 'data:image/')) {
        $pos = strpos($value, ',');
        if ($pos === false) return false;
        return base64_decode(substr($value, $pos + 1), true);
    }
    // Plain base64
    $decoded = base64_decode($value, true);
    if ($decoded !== false && strlen($decoded) > 10) return $decoded;
    // Raw binary
    return $value;
}

/**
 * Check if value is already stored as JPEG (data URI).
 */
function isAlreadyJpeg(string $value): bool {
    return str_starts_with($value, 'data:image/jpeg;base64,');
}

/**
 * Convert raw binary image to JPEG binary using GD.
 * Fills transparent background (PNG/GIF) with white.
 */
function toJpegBinary(string $rawBinary, int $quality): string|false {
    $gd = @imagecreatefromstring($rawBinary);
    if ($gd === false) return false;

    $w      = imagesx($gd);
    $h      = imagesy($gd);
    $canvas = imagecreatetruecolor($w, $h);
    $white  = imagecolorallocate($canvas, 255, 255, 255);
    imagefill($canvas, 0, 0, $white);
    imagecopy($canvas, $gd, 0, 0, 0, 0, $w, $h);
    imagedestroy($gd);

    ob_start();
    imagejpeg($canvas, null, $quality);
    $jpeg = ob_get_clean();
    imagedestroy($canvas);

    return $jpeg ?: false;
}

/**
 * Generate filename: Image_YYYY-MM-DD_HH-mm-ss.jpeg
 */
function makeFilename(): string {
    return 'Image_' . date('Y-m-d_H-i-s') . '.jpeg';
}

// ══════════════════════════════════════════════════════════════
//  MAIN: fetch all users → convert → UPDATE DB → save file
// ══════════════════════════════════════════════════════════════
$colList = implode(', ', $columns);
$stmt    = $pdo->query("SELECT id, name, employee_id, {$colList} FROM users ORDER BY id ASC");
$users   = $stmt->fetchAll(PDO::FETCH_ASSOC);

$totalConverted = 0;
$totalSkipped   = 0;
$totalSaved     = 0;

echo "\n══════════════════════════════════════════════════\n";
echo "   BLOB → JPEG Converter  (DB UPDATE + File Save)\n";
echo "══════════════════════════════════════════════════\n";

foreach ($users as $user) {
    $uid  = (int)$user['id'];
    $name = $user['name'] ?? 'Unknown';
    $eid  = $user['employee_id'] ?? '—';

    $hasAny = false;
    foreach ($columns as $col) {
        if (!empty($user[$col])) { $hasAny = true; break; }
    }
    if (!$hasAny) continue;  // skip users with no images at all

    echo "\n👤 User #{$uid}: {$name} ({$eid})\n";

    foreach ($columns as $col) {
        $dbVal = $user[$col] ?? null;

        if (empty($dbVal)) {
            echo "   [{$col}] — empty, skipped.\n";
            continue;
        }

        // Already JPEG? skip DB update but still save a copy
        if (isAlreadyJpeg($dbVal)) {
            echo "   [{$col}] ✔ Already image/jpeg — no DB update needed.\n";

            // Still save a copy to disk
            $rawBin = decodeToBinary($dbVal);
            if ($rawBin !== false) {
                $fname = makeFilename();
                file_put_contents($outputDir . $fname, $rawBin);
                echo "             📁 Saved copy → {$fname}\n";
                $totalSaved++;
            }
            $totalSkipped++;
            continue;
        }

        // ── Step 1: Decode to binary ──────────────────────────
        $rawBin = decodeToBinary($dbVal);
        if ($rawBin === false) {
            echo "   [{$col}] ❌ Could not decode image — skipped.\n";
            continue;
        }

        // ── Step 2: Convert to JPEG binary ────────────────────
        $jpegBin = toJpegBinary($rawBin, $jpegQuality);
        if ($jpegBin === false) {
            echo "   [{$col}] ❌ GD conversion failed — skipped.\n";
            continue;
        }

        // ── Step 3: Encode back to base64 data URI (JPEG) ─────
        $newDataUri = 'data:image/jpeg;base64,' . base64_encode($jpegBin);

        // ── Step 4: UPDATE the database ───────────────────────
        $updateSql  = "UPDATE users SET {$col} = :{$col} WHERE id = :id";
        $updateStmt = $pdo->prepare($updateSql);
        $updateStmt->bindParam(":{$col}", $newDataUri);
        $updateStmt->bindParam(':id', $uid, PDO::PARAM_INT);

        if ($updateStmt->execute()) {
            $sizeKb = round(strlen($jpegBin) / 1024, 2);
            echo "   [{$col}] ✅ DB UPDATED → image/jpeg  ({$sizeKb} KB)\n";
            $totalConverted++;
        } else {
            echo "   [{$col}] ❌ DB update failed.\n";
            continue;
        }

        // ── Step 5: Save file as Image_YYYY-MM-DD_HH-mm-ss.jpeg ─
        $fname    = makeFilename();
        $filepath = $outputDir . $fname;

        if (file_put_contents($filepath, $jpegBin) !== false) {
            echo "             📁 File saved → {$fname}\n";
            echo "             🗂️  Path: {$filepath}\n";
            $totalSaved++;
        } else {
            echo "             ⚠️  File save failed (DB was still updated).\n";
        }

        // Small pause so filenames are unique if multiple images processed
        sleep(1);
    }
}

echo "\n══════════════════════════════════════════════════\n";
echo "🎉 Conversion Complete!\n";
echo "   ✅ DB columns updated : {$totalConverted}\n";
echo "   ⏭️  Already JPEG (skipped DB) : {$totalSkipped}\n";
echo "   📁 Files saved        : {$totalSaved}\n";
echo "   📂 Output dir         : {$outputDir}\n";
echo "══════════════════════════════════════════════════\n\n";
?>
