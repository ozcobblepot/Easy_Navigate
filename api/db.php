<?php
/* ═══════════════════════════════════════════════════════════════
   api/db.php — Central database connection for Easy Navigate
   Usage: require_once __DIR__ . '/db.php';
          then use $pdo for all queries.
   ═══════════════════════════════════════════════════════════════ */

/* ── CONFIG (edit these to match your XAMPP/MySQL setup) ─────── */
define('DB_HOST',    'localhost');
define('DB_PORT',    '3306');
define('DB_NAME',    'easy_navigate');   // your database name
define('DB_USER',    'root');            // XAMPP default
define('DB_PASS',    '');                // XAMPP default (empty)
define('DB_CHARSET', 'utf8mb4');

/* ── CREATE PDO CONNECTION ───────────────────────────────────── */
function getDB(): PDO {
    static $pdo = null;
    if ($pdo !== null) return $pdo;

    $dsn = sprintf(
        'mysql:host=%s;port=%s;dbname=%s;charset=%s',
        DB_HOST, DB_PORT, DB_NAME, DB_CHARSET
    );

    try {
        $pdo = new PDO($dsn, DB_USER, DB_PASS, [
            PDO::ATTR_ERRMODE            => PDO::ERRMODE_EXCEPTION,
            PDO::ATTR_DEFAULT_FETCH_MODE => PDO::FETCH_ASSOC,
            PDO::ATTR_EMULATE_PREPARES   => false,
        ]);
    } catch (PDOException $e) {
        http_response_code(500);
        header('Content-Type: application/json');
        echo json_encode([
            'ok'      => false,
            'message' => 'Database connection failed: ' . $e->getMessage(),
        ]);
        exit;
    }

    return $pdo;
}

/* ── SHARED RESPONSE HELPERS ─────────────────────────────────── */
function jsonOk(array $data = []): void {
    header('Content-Type: application/json');
    echo json_encode(array_merge(['ok' => true], $data));
    exit;
}

function jsonError(string $message, int $code = 400): void {
    http_response_code($code);
    header('Content-Type: application/json');
    echo json_encode(['ok' => false, 'message' => $message]);
    exit;
}

function corsHeaders(): void {
    header('Access-Control-Allow-Origin: *');
    header('Access-Control-Allow-Methods: GET, POST, OPTIONS');
    header('Access-Control-Allow-Headers: Content-Type, Accept');
    if ($_SERVER['REQUEST_METHOD'] === 'OPTIONS') exit;
}