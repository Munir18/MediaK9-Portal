<?php
class Client {
    public static function apply(array $post): void {
        Auth::verifyCsrf();

        if (defined('RECAPTCHA_SECRET_KEY') && RECAPTCHA_SECRET_KEY !== '') {
            $recaptchaToken = $post['recaptcha_token'] ?? '';
            if (!$recaptchaToken || !verifyReCaptcha($recaptchaToken)) {
                Auth::jsonError('reCAPTCHA verification failed. Please try again.');
            }
        }

        $orgName      = htmlspecialchars(trim($post['organization_name'] ?? ''), ENT_QUOTES, 'UTF-8');
        $contactName  = htmlspecialchars(trim($post['contact_name'] ?? ''), ENT_QUOTES, 'UTF-8');
        $contactEmail = filter_var(trim($post['contact_email'] ?? ''), FILTER_VALIDATE_EMAIL);
        $contactPhone = htmlspecialchars(trim($post['contact_phone'] ?? ''), ENT_QUOTES, 'UTF-8');
        $service      = htmlspecialchars(trim($post['service_required'] ?? ''), ENT_QUOTES, 'UTF-8');
        $budget       = htmlspecialchars(trim($post['budget'] ?? ''), ENT_QUOTES, 'UTF-8');
        $website      = htmlspecialchars(trim($post['website'] ?? ''), ENT_QUOTES, 'UTF-8');
        $timeline     = htmlspecialchars(trim($post['timeline'] ?? ''), ENT_QUOTES, 'UTF-8');
        $desc         = htmlspecialchars(trim($post['project_description'] ?? ''), ENT_QUOTES, 'UTF-8');
        $competitors  = htmlspecialchars(trim($post['competitors'] ?? ''), ENT_QUOTES, 'UTF-8');
        $bdmCode      = strtoupper(trim($post['bdm_code'] ?? ''));
        // Normalize code: accept '101' or 'MK9-101' — convert bare digits to full format
        if ($bdmCode && !str_starts_with($bdmCode, BDM_CODE_PREFIX)) {
            $bdmCode = BDM_CODE_PREFIX . $bdmCode;
        }

        if (!$orgName || !$contactName || !$service || !$budget || !$timeline || !$desc) {
            Auth::jsonError('Please fill in all required fields.');
        }
        if (!$contactEmail) Auth::jsonError('Invalid contact email address.');
        if (!BDMCode::validate($bdmCode))            Auth::jsonError('Invalid or inactive BDM code.');

        $bdmUserId = BDMCode::getBdmUserIdByCode($bdmCode);

        $clientId = Database::insert('mk9_clients', [
            'organization_name'   => $orgName,
            'contact_name'        => $contactName,
            'contact_email'       => $contactEmail,
            'contact_phone'       => $contactPhone,
            'service_required'    => $service,
            'budget'              => $budget,
            'website'             => $website,
            'timeline'            => $timeline,
            'project_description' => $desc,
            'competitors'         => $competitors,
            'bdm_code'            => $bdmCode,
            'bdm_user_id'         => $bdmUserId,
            'status'              => 'pending',
            'created_at'          => date('Y-m-d H:i:s'),
        ]);

        Database::insert('mk9_activity_log', [
            'user_id'    => $bdmUserId ?? 0,
            'action'     => 'client_applied',
            'details'    => $orgName . ' applied using code ' . $bdmCode . '.',
            'created_at' => date('Y-m-d H:i:s'),
        ]);

        Auth::jsonSuccess(['message' => 'Application received. The MediaK9 team will contact you within 2–3 business days.']);
    }

    public static function createProject(int $clientId): int {
        $client = Database::row("SELECT * FROM mk9_clients WHERE id = ?", [$clientId]);
        if (!$client) return 0;

        return Database::insert('mk9_projects', [
            'client_id'         => $clientId,
            'bdm_user_id'       => $client->bdm_user_id,
            'bdm_code'          => $client->bdm_code,
            'organization_name' => $client->organization_name,
            'service_required'  => $client->service_required,
            'status'            => 'ongoing',
            'created_at'        => date('Y-m-d H:i:s'),
        ]);
    }
}
