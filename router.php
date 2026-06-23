<?php
// This file is created to catch requests if the PHP dev server was started from the root directory instead of the server/ directory.
// It changes the working directory and forwards the request to the actual router.
chdir(__DIR__ . '/server');
require __DIR__ . '/server/router.php';
