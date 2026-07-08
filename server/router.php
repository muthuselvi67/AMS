<?php
// Router script for PHP built-in server
// Routes all non-file requests to index.php

$uri = $_SERVER['REQUEST_URI'];
$path = parse_url($uri, PHP_URL_PATH);

// If the file is in uploads, serve it manually with correct headers
if (strpos($path, '/uploads/') === 0) {
    // URL-decode the path so filenames with spaces (encoded as %20) are found on disk
    $decodedPath = urldecode($path);
    $filePath = __DIR__ . $decodedPath;
    if (file_exists($filePath)) {
        $ext = strtolower(pathinfo($filePath, PATHINFO_EXTENSION));
        $mimeTypes = [
            'jpg'  => 'image/jpeg',
            'jpeg' => 'image/jpeg',
            'png'  => 'image/png',
            'gif'  => 'image/gif',
            'webp' => 'image/webp',
            'webm' => 'video/webm',
            'pdf'  => 'application/pdf',
            'docx' => 'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
        ];
        $mimeType = $mimeTypes[$ext] ?? 'application/octet-stream';
        header("Content-Type: " . $mimeType);
        header("Content-Length: " . filesize($filePath));
        readfile($filePath);
        exit;
    }
}

// If the file exists on disk, serve it directly (for static assets)
if ($path !== '/' && file_exists(__DIR__ . $path)) {
    return false;
}

// Route everything else through index.php
require __DIR__ . '/index.php';