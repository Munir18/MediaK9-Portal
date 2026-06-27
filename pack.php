<?php
/**
 * pack.php - Dynamic BDM Portal packaging utility
 * Run this in your browser to build the final delivery zip archives.
 * Please delete this file after packaging.
 */
error_reporting(E_ALL);
ini_set('display_errors', 1);

$baseDir = dirname(__DIR__); // Campus Partnership Program root directory

// Helper function to recursively zip folders
function addFolderToZip($zip, $folderPath, $relativeTo, $prefix = '', $exclusions = []) {
    $files = new RecursiveIteratorIterator(
        new RecursiveDirectoryIterator($folderPath, RecursiveDirectoryIterator::SKIP_DOTS),
        RecursiveIteratorIterator::LEAVES_ONLY
    );

    foreach ($files as $name => $file) {
        if (!$file->isDir()) {
            $filePath = $file->getRealPath();
            $relativePath = substr($filePath, strlen($relativeTo) + 1);

            // Check if file starts with any excluded path
            $shouldExclude = false;
            foreach ($exclusions as $exclude) {
                $normalPath = str_replace('\\', '/', $relativePath);
                if (strpos($normalPath, $exclude) === 0) {
                    // Do not exclude uploads/.htaccess
                    if ($normalPath === 'uploads/.htaccess') {
                        continue;
                    }
                    $shouldExclude = true;
                    break;
                }
            }
            if ($shouldExclude) continue;

            $entryName = $prefix . str_replace('\\', '/', $relativePath);
            $zip->addFile($filePath, $entryName);
        }
    }
}

if (!class_exists('ZipArchive')) {
    die("<p style='color:red;font-family:sans-serif;'><b>Error:</b> PHP ZipArchive extension is not enabled on this server.</p>");
}

echo "<div style='font-family:sans-serif;padding:20px;background:#100d0b;color:#f5ede0;min-height:100vh;'>";
echo "<h2 style='color:#e8541c;border-bottom:1px solid #332d29;padding-bottom:10px;'>MediaK9 Portal Packager</h2>";

// Common exclusions for standalone packages (development utilities, sensitive migration scripts, and uploads folder content)
$commonExclusions = [
    'pack.php',
    'cnic_migrate.php',
    'scratch-db-check.php',
    'local-router.php',
    'build-preview.js',
    'uploads/'
];

// 1. Package mk9-portal-FINAL.zip (flat at root)
$finalZip = $baseDir . '/mk9-portal-FINAL.zip';
if (file_exists($finalZip)) @unlink($finalZip);
$zip1 = new ZipArchive();
if ($zip1->open($finalZip, ZipArchive::CREATE | ZipArchive::OVERWRITE) === true) {
    addFolderToZip($zip1, $baseDir . '/mk9-portal-standalone', $baseDir . '/mk9-portal-standalone', '', $commonExclusions);
    $zip1->close();
    echo "<p style='color:#a3e635;'>✓ <b>mk9-portal-FINAL.zip</b> successfully compiled at workspace root.</p>";
} else {
    echo "<p style='color:#f87171;'>✗ Failed to create mk9-portal-FINAL.zip</p>";
}

// 2. Package mk9-portal-standalone.zip (nested inside folder, excluding preview)
$standaloneZip = $baseDir . '/mk9-portal-standalone.zip';
if (file_exists($standaloneZip)) @unlink($standaloneZip);
$zip2 = new ZipArchive();
if ($zip2->open($standaloneZip, ZipArchive::CREATE | ZipArchive::OVERWRITE) === true) {
    $exclusionsWithPreview = array_merge(['preview/'], $commonExclusions);
    addFolderToZip($zip2, $baseDir . '/mk9-portal-standalone', $baseDir . '/mk9-portal-standalone', 'mk9-portal-standalone/', $exclusionsWithPreview);
    $zip2->close();
    echo "<p style='color:#a3e635;'>✓ <b>mk9-portal-standalone.zip</b> successfully compiled (nested, excluding preview).</p>";
} else {
    echo "<p style='color:#f87171;'>✗ Failed to create mk9-portal-standalone.zip</p>";
}

// 3. Package mk9-bdm-portal.zip (nested inside folder)
$pluginZip = $baseDir . '/mk9-bdm-portal.zip';
if (file_exists($pluginZip)) @unlink($pluginZip);
$zip3 = new ZipArchive();
if ($zip3->open($pluginZip, ZipArchive::CREATE | ZipArchive::OVERWRITE) === true) {
    addFolderToZip($zip3, $baseDir . '/mk9-bdm-portal', $baseDir . '/mk9-bdm-portal', 'mk9-bdm-portal/');
    $zip3->close();
    echo "<p style='color:#a3e635;'>✓ <b>mk9-bdm-portal.zip</b> successfully compiled.</p>";
} else {
    echo "<p style='color:#f87171;'>✗ Failed to create mk9-bdm-portal.zip</p>";
}

echo "<hr style='border:0;border-top:1px solid #332d29;margin:20px 0;'>";
echo "<p style='color:#9a938a;'>Packaging complete! <b>Remember to delete pack.php</b> from your web root after use for security.</p>";
echo "</div>";
