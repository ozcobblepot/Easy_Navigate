<?php
/* ═══════════════════════════════════════════════════════════════
   api/search_taxi_airports.php
   Returns all airports with airline info for the taxi page.
   ═══════════════════════════════════════════════════════════════ */
require_once __DIR__ . '/db.php';
corsHeaders();

$pdo = getDB();

try {
    /* Fetch airports */
    $airports = $pdo->query("
        SELECT
            a.id,
            a.iata,
            a.city,
            a.terminal,
            a.flight_count
        FROM airports a
        ORDER BY a.flight_count DESC, a.city ASC
    ")->fetchAll();

    /* For each airport, attach its airlines */
    $airlineStmt = $pdo->prepare("
        SELECT al.name, al.logo
        FROM airport_airlines aa
        JOIN airlines al ON al.id = aa.airline_id
        WHERE aa.airport_id = :airport_id
        ORDER BY al.name ASC
        LIMIT 5
    ");

    foreach ($airports as &$ap) {
        $airlineStmt->execute([':airport_id' => $ap['id']]);
        $ap['airlines'] = $airlineStmt->fetchAll();
    }
    unset($ap);

    jsonOk(['airports' => $airports]);

} catch (PDOException $e) {
    jsonError('Query failed: ' . $e->getMessage(), 500);
}