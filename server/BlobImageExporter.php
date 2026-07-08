<?php
/**
 * ══════════════════════════════════════════════════════════════
 *  BlobImageExporter.php
 *  Reads BLOB/base64 images from MySQL, converts to JPEG,
 *  saves as  Image_YYYY-MM-DD_HH-mm-ss.jpeg  and returns path.
 * ══════════════════════════════════════════════════════════════
 */

// ─── Database config ──────────────────────────────────────────
define('DB_HOST',     'localhost');
define('DB_NAME',     'lms_db');
define('DB_USER',     'root');
define('DB_PASS',     '12345678');

// ─── Output directory ─────────────────────────────────────────
define('OUTPUT_DIR',  __DIR__ . '/uploads/exported_images/');

// ─── JPEG quality (0-100) ─────────────────────────────────────
define('JPEG_QUALITY', 90);


/**
 * Connect to database and return PDO instance.
 */
function getDb(): PDO {
    $dsn = 'mysql:host=' . DB_HOST . ';dbname=' . DB_NAME . ';charset=utf8';
    $pdo = new PDO($dsn, DB_USER, DB_PASS);
    $pdo->setAttribute(PDO::ATTR_ERRMODE, PDO::ERRMODE_EXCEPTION);
    return $pdo;
}


/**
 * Convert any image binary (JPEG/PNG/GIF/WEBP) to JPEG binary.
 *
 * @param  string $rawBinary   Raw image bytes
 * @return string|false        JPEG binary, or false on failure
 */
function convertBinaryToJpeg(string $rawBinary): string|false {
    // Load image via GD (auto-detects PNG, JPEG, GIF, WEBP, etc.)
    $gdImage = @imagecreatefromstring($rawBinary);
    if ($gdImage === false) {
        return false;
    }

    // Handle transparency for PNG/GIF → white background
    $w = imagesx($gdImage);
    $h = imagesy($gdImage);
    $canvas = imagecreatetruecolor($w, $h);
    $white  = imagecolorallocate($canvas, 255, 255, 255);
    imagefill($canvas, 0, 0, $white);
    imagecopy($canvas, $gdImage, 0, 0, 0, 0, $w, $h);
    imagedestroy($gdImage);

    // Capture JPEG output in memory buffer
    ob_start();
    imagejpeg($canvas, null, JPEG_QUALITY);
    $jpegBinary = ob_get_clean();
    imagedestroy($canvas);

    return $jpegBinary;
}


/**
 * Decode a database image column value.
 * Handles:
 *   - Raw binary BLOB  (MySQL BLOB/MEDIUMBLOB)
 *   - base64 string    (plain base64)
 *   - data URI         (data:image/png;base64,....)
 *
 * @param  string $dbValue   Raw value from DB column
 * @return string|false      Decoded binary image data, or false
 */
function decodeDbImage(string $dbValue): string|false {
    if (empty($dbValue)) return false;

    // Case 1 – data URI:  data:image/jpeg;base64,/9j/4AA...
    if (str_starts_with($dbValue, 'data:image/')) {
        $commaPos = strpos($dbValue, ',');
        if ($commaPos === false) return false;
        $b64  = substr($dbValue, $commaPos + 1);
        $data = base64_decode($b64, true);
        return $data !== false ? $data : false;
    }

    // Case 2 – pure base64 string (no header)
    $decoded = base64_decode($dbValue, true);
    if ($decoded !== false && !ctype_print($dbValue)) {
        // Verify it looks like an image (magic bytes check)
        if (isImageBinary($decoded)) return $decoded;
    }
    if ($decoded !== false && isImageBinary($decoded)) {
        return $decoded;
    }

    // Case 3 – already raw binary BLOB
    if (isImageBinary($dbValue)) {
        return $dbValue;
    }

    return false;
}


/**
 * Quick check: does this binary start with a known image magic number?
 */
function isImageBinary(string $data): bool {
    if (strlen($data) < 4) return false;
    $magic = substr($data, 0, 4);

    return (
        substr($magic, 0, 2) === "\xFF\xD8"       ||  // JPEG
        substr($magic, 0, 4) === "\x89PNG"         ||  // PNG
        substr($magic, 0, 4) === 'GIF8'            ||  // GIF
        substr($magic, 0, 4) === 'RIFF'                // WEBP (RIFF....WEBP)
    );
}


/**
 * Generate the filename: Image_YYYY-MM-DD_HH-mm-ss.jpeg
 *
 * @param  string|null $timestamp  Optional datetime string, defaults to now
 * @return string
 */
function generateFilename(?string $timestamp = null): string {
    $dt = $timestamp ? new DateTime($timestamp) : new DateTime();
    return 'Image_' . $dt->format('Y-m-d_H-i-s') . '.jpeg';
}


/**
 * Save JPEG binary to disk inside OUTPUT_DIR.
 *
 * @param  string $jpegBinary
 * @param  string $filename
 * @return string  Full absolute path of saved file
 * @throws RuntimeException on write failure
 */
function saveJpegFile(string $jpegBinary, string $filename): string {
    if (!is_dir(OUTPUT_DIR)) {
        mkdir(OUTPUT_DIR, 0755, true);
    }

    $fullPath = OUTPUT_DIR . $filename;

    if (file_put_contents($fullPath, $jpegBinary) === false) {
        throw new RuntimeException("Failed to write file: {$fullPath}");
    }

    return $fullPath;
}


/**
 * ══════════════════════════════════════════════════════════════
 *  MAIN FUNCTION
 *  Read BLOB from DB → convert to JPEG → save → return path
 *
 * @param  int    $userId      User ID (row to fetch)
 * @param  string $column      DB column name: 'avatar' or 'cover_photo'
 * @return array {
 *     success  bool,
 *     path     string|null,   // absolute saved path
 *     filename string|null,   // just the filename
 *     size_kb  float|null,
 *     message  string
 * }
 * ══════════════════════════════════════════════════════════════
 */
function exportBlobImageAsJpeg(int $userId, string $column = 'avatar'): array {
    $allowed = ['avatar', 'cover_photo', 'id_card_photo'];
    if (!in_array($column, $allowed)) {
        return ['success' => false, 'path' => null, 'filename' => null,
                'size_kb' => null, 'message' => "Invalid column: {$column}"];
    }

    try {
        $pdo  = getDb();

        // 1. Read the BLOB column from DB
        $stmt = $pdo->prepare("SELECT {$column}, name FROM users WHERE id = :id LIMIT 1");
        $stmt->bindParam(':id', $userId, PDO::PARAM_INT);
        $stmt->execute();
        $row  = $stmt->fetch(PDO::FETCH_ASSOC);

        if (!$row) {
            return ['success' => false, 'path' => null, 'filename' => null,
                    'size_kb' => null, 'message' => "User ID {$userId} not found."];
        }

        $dbValue = $row[$column] ?? null;
        if (empty($dbValue)) {
            return ['success' => false, 'path' => null, 'filename' => null,
                    'size_kb' => null, 'message' => "Column '{$column}' is empty for user {$userId}."];
        }

        // 2. Decode the DB image value (handles BLOB / base64 / data URI)
        $rawBinary = decodeDbImage($dbValue);
        if ($rawBinary === false) {
            return ['success' => false, 'path' => null, 'filename' => null,
                    'size_kb' => null, 'message' => "Could not decode image data from column '{$column}'."];
        }

        // 3. Convert to JPEG
        $jpegBinary = convertBinaryToJpeg($rawBinary);
        if ($jpegBinary === false) {
            return ['success' => false, 'path' => null, 'filename' => null,
                    'size_kb' => null, 'message' => "GD failed to convert image to JPEG."];
        }

        // 4. Generate filename:  Image_2026-06-30_12-32-37.jpeg
        $filename = generateFilename();

        // 5. Save to disk
        $savedPath = saveJpegFile($jpegBinary, $filename);

        $sizeKb = round(strlen($jpegBinary) / 1024, 2);

        return [
            'success'  => true,
            'path'     => $savedPath,
            'filename' => $filename,
            'size_kb'  => $sizeKb,
            'message'  => "Image saved successfully as {$filename} ({$sizeKb} KB)",
        ];

    } catch (PDOException $e) {
        return ['success' => false, 'path' => null, 'filename' => null,
                'size_kb' => null, 'message' => "DB Error: " . $e->getMessage()];
    } catch (RuntimeException $e) {
        return ['success' => false, 'path' => null, 'filename' => null,
                'size_kb' => null, 'message' => "File Error: " . $e->getMessage()];
    }
}


// ══════════════════════════════════════════════════════════════
//  USAGE EXAMPLES
// ══════════════════════════════════════════════════════════════

echo "══════════════════════════════════════════\n";
echo "  BLOB Image → JPEG Exporter\n";
echo "══════════════════════════════════════════\n\n";

// ── Example 1: Export avatar of user ID 1 ─────────────────────
echo "▶ Exporting avatar  (user ID = 1) ...\n";
$result = exportBlobImageAsJpeg(1, 'avatar');
if ($result['success']) {
    echo "  ✅ Saved : " . $result['filename'] . "\n";
    echo "  📁 Path  : " . $result['path'] . "\n";
    echo "  📦 Size  : " . $result['size_kb'] . " KB\n";
} else {
    echo "  ❌ " . $result['message'] . "\n";
}

echo "\n";

// ── Example 2: Export cover_photo of user ID 1 ────────────────
echo "▶ Exporting cover_photo  (user ID = 1) ...\n";
$result = exportBlobImageAsJpeg(1, 'cover_photo');
if ($result['success']) {
    echo "  ✅ Saved : " . $result['filename'] . "\n";
    echo "  📁 Path  : " . $result['path'] . "\n";
    echo "  📦 Size  : " . $result['size_kb'] . " KB\n";
} else {
    echo "  ❌ " . $result['message'] . "\n";
}

echo "\n";

// ── Example 3: Loop over ALL users ───────────────────────────
echo "▶ Exporting all users with images ...\n";
try {
    $pdo   = getDb();
    $stmt  = $pdo->query("SELECT id, name, employee_id FROM users ORDER BY id ASC");
    $users = $stmt->fetchAll(PDO::FETCH_ASSOC);

    foreach ($users as $u) {
        $uid  = (int)$u['id'];
        $name = $u['name'];
        $eid  = $u['employee_id'] ?? '—';
        echo "\n  👤 User #{$uid}: {$name} ({$eid})\n";

        foreach (['avatar', 'cover_photo'] as $col) {
            $r = exportBlobImageAsJpeg($uid, $col);
            if ($r['success']) {
                echo "    ✅ [{$col}] {$r['filename']}  ({$r['size_kb']} KB)\n";
                echo "       📁 {$r['path']}\n";
            } else {
                echo "    — [{$col}] " . $r['message'] . "\n";
            }
        }
    }
} catch (PDOException $e) {
    echo "  ❌ DB Error: " . $e->getMessage() . "\n";
}

echo "\n══════════════════════════════════════════\n";
echo "  Done! Files saved to:\n";
echo "  " . OUTPUT_DIR . "\n";
echo "══════════════════════════════════════════\n";
?>
