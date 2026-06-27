<?php
class ChangeRequest {
    private static array $fileFields = [
        'profile_picture', 'university_card_front', 'university_card_back'
    ];

    // Fields allowed for change requests (password excluded — BDMs change it directly)
    private static array $allowedTextFields = [
        'full_name', 'father_name', 'phone', 'father_cnic', 'cnic_number'
    ];

    public static function submit(array $post, array $files): void {
        Auth::verifyCsrf();
        Auth::requireAjaxAuth();

        $userId    = Auth::userId();
        $fieldName = htmlspecialchars(trim($post['field_name'] ?? ''), ENT_QUOTES, 'UTF-8');
        $newValue  = htmlspecialchars(trim($post['new_value'] ?? ''), ENT_QUOTES, 'UTF-8');

        if (!$fieldName) Auth::jsonError('Please select which field to change.');

        // Block password from change requests — handled via mk9_change_password directly
        if ($fieldName === 'password') Auth::jsonError('Password changes must be made through the Change Password section.');

        $profile  = BDM::getProfile($userId);
        $oldValue = $profile ? ($profile->{$fieldName} ?? '') : '';

        $newFile = null;
        if (in_array($fieldName, self::$fileFields, true)) {
            if (empty($files['new_file']['tmp_name'])) Auth::jsonError('Please upload a file for this field.');
            $folderName = $profile ? ($profile->full_name . '-' . $profile->user_id) : '';
            $newFile = FileHandler::upload($files['new_file'], $fieldName, $folderName);
            if (!$newFile) Auth::jsonError('File upload failed. Check type (JPG/PNG/PDF) and size (max 5MB).');
            $newValue = $newFile;
        } else {
            if (!$newValue) Auth::jsonError('Please enter the new value.');
            if ($fieldName === 'cnic_number') {
                $cnicDigits = preg_replace('/\D/', '', $newValue);
                if (!preg_match('/^\d{13}$/', $cnicDigits)) {
                    Auth::jsonError('CNIC must be exactly 13 digits (e.g. 6110169898892).');
                }
                $cnicFormatted = substr($cnicDigits, 0, 5) . '-' . substr($cnicDigits, 5, 7) . '-' . substr($cnicDigits, 12, 1);
                $newValue = base64_encode(FileHandler::encryptField($cnicFormatted));
                if ($oldValue) {
                    $oldValue = base64_encode($oldValue);
                }
            }
        }

        Database::insert('mk9_change_requests', [
            'bdm_user_id' => $userId,
            'field_name'  => $fieldName,
            'old_value'   => (string) $oldValue,
            'new_value'   => $newValue,
            'status'      => 'pending',
            'created_at'  => date('Y-m-d H:i:s'),
        ]);

        Auth::jsonSuccess(['message' => 'Change request submitted. Admin will review it shortly.']);
    }

    public static function getByBDM(int $userId): array {
        return Database::query(
            "SELECT * FROM mk9_change_requests WHERE bdm_user_id = ? ORDER BY created_at DESC",
            [$userId]
        );
    }

    public static function applyApproved(int $requestId): void {
        $cr = Database::row("SELECT * FROM mk9_change_requests WHERE id = ?", [$requestId]);
        if (!$cr) return;

        // Password changes are never stored as change requests — skip silently
        if ($cr->field_name === 'password') return;

        $valueToApply = $cr->new_value;

        // If this is a CNIC number change request, re-validate and AES-256 encrypt before storing
        if ($cr->field_name === 'cnic_number') {
            $decrypted = FileHandler::decryptField(base64_decode($valueToApply));
            if ($decrypted !== '') {
                $valueToApply = base64_decode($valueToApply);
            } else {
                $cnicDigits = preg_replace('/\D/', '', $valueToApply);
                if (!preg_match('/^\d{13}$/', $cnicDigits)) return; // invalid, skip silently
                $cnicFormatted = substr($cnicDigits, 0, 5) . '-' . substr($cnicDigits, 5, 7) . '-' . substr($cnicDigits, 12, 1);
                $valueToApply = FileHandler::encryptField($cnicFormatted);
            }
        }

        Database::update('mk9_bdm_profiles', [$cr->field_name => $valueToApply], ['user_id' => $cr->bdm_user_id]);

        if ($cr->field_name === 'full_name') {
            Database::update('users', ['full_name' => $cr->new_value], ['id' => $cr->bdm_user_id]);
        }

        if (in_array($cr->field_name, self::$fileFields, true) && $cr->old_value) {
            FileHandler::delete($cr->old_value);
        }
    }
}
