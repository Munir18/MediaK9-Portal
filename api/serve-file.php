<?php
require_once dirname(__DIR__) . '/config/config.php';
require_once dirname(__DIR__) . '/config/database.php';
require_once dirname(__DIR__) . '/src/Database.php';
require_once dirname(__DIR__) . '/src/Auth.php';
require_once dirname(__DIR__) . '/src/FileHandler.php';

Auth::start();

if (!Auth::isLoggedIn()) {
    http_response_code(403);
    exit;
}

$file = $_GET['file'] ?? '';
if (!$file || strpos($file, '..') !== false || strpos($file, '\\') !== false) {
    http_response_code(400);
    exit;
}

if (!preg_match('/^(?:[a-zA-Z0-9_\-\s\.]+\/)?[a-zA-Z0-9_\-\s\.]+\.enc$/', $file)) {
    http_response_code(400);
    exit;
}

if (!Auth::isAdmin()) {
    $userId   = Auth::userId();
    $allowed  = [
        "SELECT profile_picture FROM mk9_bdm_profiles WHERE user_id = ?",
    ];
    $isOwner  = false;
    $row      = Database::row("SELECT * FROM mk9_bdm_profiles WHERE user_id = ?", [$userId]);
    if ($row) {
        $ownedFiles = array_filter([
            $row->university_card_front, $row->university_card_back,
            $row->profile_picture,
        ]);
        $isOwner = in_array($file, $ownedFiles, true);
    }
    if (!$isOwner) {
        http_response_code(403);
        exit;
    }
}

FileHandler::serveFile($file);
