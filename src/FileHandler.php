<?php
class FileHandler {
    private static function key(): string {
        return hash('sha256', APP_KEY, true);
    }

    /**
     * AES-256-CBC encrypt a plain-text string for DB storage.
     * Returns raw binary (IV prepended). Store in VARBINARY column.
     */
    public static function encryptField(string $plaintext): string {
        $iv = random_bytes(16);
        $encrypted = openssl_encrypt($plaintext, 'AES-256-CBC', self::key(), OPENSSL_RAW_DATA, $iv);
        return $iv . $encrypted;
    }

    /**
     * Decrypt a field that was encrypted with encryptField().
     * Returns the plain-text string, or empty string on failure.
     */
    public static function decryptField(string $cipherBinary): string {
        if (strlen($cipherBinary) < 17) return '';
        $iv   = substr($cipherBinary, 0, 16);
        $data = substr($cipherBinary, 16);
        $plain = openssl_decrypt($data, 'AES-256-CBC', self::key(), OPENSSL_RAW_DATA, $iv);
        return $plain !== false ? $plain : '';
    }


    public static function encrypt(string $sourcePath, string $destPath): bool {
        $iv = random_bytes(16);
        $data = file_get_contents($sourcePath);
        if ($data === false) return false;
        $encrypted = openssl_encrypt($data, 'AES-256-CBC', self::key(), OPENSSL_RAW_DATA, $iv);
        return file_put_contents($destPath, $iv . $encrypted) !== false;
    }

    public static function decrypt(string $filePath): string|false {
        $raw = file_get_contents($filePath);
        if ($raw === false || strlen($raw) < 16) return false;
        $iv   = substr($raw, 0, 16);
        $data = substr($raw, 16);
        return openssl_decrypt($data, 'AES-256-CBC', self::key(), OPENSSL_RAW_DATA, $iv);
    }

    public static function upload(array $file, string $fieldName, string $subfolder = ''): string|false {
        if (empty($file['tmp_name']) || ($file['error'] ?? UPLOAD_ERR_NO_FILE) !== UPLOAD_ERR_OK) return false;
        if ($file['size'] > MAX_UPLOAD_SIZE) return false;

        $mime = null;
        if (class_exists('finfo')) {
            $finfo = new finfo(FILEINFO_MIME_TYPE);
            $mime  = $finfo->file($file['tmp_name']);
        } elseif (function_exists('mime_content_type')) {
            $mime = mime_content_type($file['tmp_name']);
        } else {
            $ext = strtolower(pathinfo($file['name'], PATHINFO_EXTENSION));
            $map = [
                'jpg'  => 'image/jpeg',
                'jpeg' => 'image/jpeg',
                'png'  => 'image/png',
                'webp' => 'image/webp',
                'pdf'  => 'application/pdf',
            ];
            $mime = $map[$ext] ?? $file['type'] ?? 'application/octet-stream';
        }

        if (!in_array($mime, ALLOWED_MIME_TYPES, true)) return false;

        if (!is_dir(UPLOAD_PATH)) mkdir(UPLOAD_PATH, 0755, true);

        // Sanitize the subfolder to prevent directory traversal or unsafe names
        $cleanedSubfolder = '';
        if ($subfolder !== '') {
            $cleanedSubfolder = preg_replace('/[^a-zA-Z0-9_\-]/', '-', strtolower($subfolder));
            $cleanedSubfolder = preg_replace('/-+/', '-', $cleanedSubfolder);
            $cleanedSubfolder = trim($cleanedSubfolder, '-');
        }

        $filename = $fieldName . '_' . bin2hex(random_bytes(8)) . '.enc';

        if ($cleanedSubfolder !== '') {
            $destDir = UPLOAD_PATH . $cleanedSubfolder . '/';
            if (!is_dir($destDir)) mkdir($destDir, 0755, true);
            $destPath = $destDir . $filename;
            $dbPath = $cleanedSubfolder . '/' . $filename;
        } else {
            $destPath = UPLOAD_PATH . $filename;
            $dbPath = $filename;
        }

        if (!self::encrypt($file['tmp_name'], $destPath)) return false;

        return $dbPath;
    }

    public static function serveFile(string $filename): never {
        $path = UPLOAD_PATH . $filename;
        if (!file_exists($path) || is_dir($path)) {
            http_response_code(404);
            exit;
        }
        $data = self::decrypt($path);
        if ($data === false) {
            http_response_code(500);
            exit;
        }
        
        $mime = null;
        if (class_exists('finfo')) {
            $finfo = new finfo(FILEINFO_MIME_TYPE);
            $mime  = $finfo->buffer($data);
        } else {
            // Detect based on magic bytes
            $header = substr($data, 0, 4);
            if (strpos($header, "\xFF\xD8") === 0) {
                $mime = 'image/jpeg';
            } elseif (strpos($header, "\x89PNG") === 0) {
                $mime = 'image/png';
            } elseif (strpos($header, 'RIFF') === 0 && strpos(substr($data, 8, 4), 'WEBP') === 0) {
                $mime = 'image/webp';
            } elseif (strpos($header, '%PDF') === 0) {
                $mime = 'application/pdf';
            }
        }
        if (!$mime) {
            $mime = 'application/octet-stream';
        }

        header('Content-Type: ' . $mime);
        header('Content-Length: ' . strlen($data));
        header('Cache-Control: private, no-store');
        header('Content-Disposition: inline');
        echo $data;
        exit;
    }

    public static function delete(string $filename): void {
        $path = UPLOAD_PATH . $filename;
        if (file_exists($path) && !is_dir($path)) {
            unlink($path);
            $dir = dirname($path);
            if (rtrim($dir, '/\\') !== rtrim(UPLOAD_PATH, '/\\') && is_dir($dir)) {
                $files = array_diff(scandir($dir), array('.', '..'));
                if (empty($files)) {
                    rmdir($dir);
                }
            }
        }
    }
}
