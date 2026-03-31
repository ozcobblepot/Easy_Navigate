<?php
/* ═══════════════════════════════════════════════════════════════
   api/search_taxi_airports.php
   Returns distinct pick-up airports derived from the `flights`
   table (origin column) — no separate airports table needed.
   ═══════════════════════════════════════════════════════════════ */
require_once __DIR__ . '/db.php';
corsHeaders();

$pdo = getDB();

try {
    /*
     * Pull every distinct origin airport from the flights table.
     * - iata         → origin  (e.g. "MNL")
     * - city         → origin_name  (e.g. "Manila")
     * - terminal     → origin_terminal (may be NULL)
     * - flight_count → how many flights depart from that airport
     * - airlines     → aggregated airline names + logos for that airport
     *
     * We GROUP BY iata + terminal so that e.g. MNL T1 and MNL T3
     * appear as separate pick-up options (matching your flights data).
     */
    $rows = $pdo->query("
        SELECT
            f.origin                        AS iata,
            f.origin_name                   AS city,
            f.origin_terminal               AS terminal,
            COUNT(*)                        AS flight_count,
            GROUP_CONCAT(
                DISTINCT CONCAT(f.airline_name, '||', COALESCE(f.airline_logo, ''))
                ORDER BY f.airline_name ASC
                SEPARATOR ';;'
            )                               AS airlines_raw
        FROM flights f
        GROUP BY f.origin, f.origin_name, f.origin_terminal
        ORDER BY flight_count DESC, city ASC
    ")->fetchAll();

    /* ── Shape the response ── */
    $airports = array_map(function ($row) {

        /* Parse the aggregated airlines string into an array */
        $airlines = [];
        if (!empty($row['airlines_raw'])) {
            foreach (explode(';;', $row['airlines_raw']) as $pair) {
                [$name, $logo] = explode('||', $pair, 2);
                $name = trim($name);
                $logo = trim($logo);
                if ($name !== '') {
                    $airlines[] = [
                        'name' => $name,
                        'logo' => $logo ?: null,
                    ];
                }
            }
            /* Keep at most 5 airline badges on the card */
            $airlines = array_slice($airlines, 0, 5);
        }

        return [
            'iata'         => $row['iata'],
            'city'         => $row['city'],
            'terminal'     => $row['terminal'] ?: null,
            'flight_count' => (int) $row['flight_count'],
            'airlines'     => $airlines,
        ];
    }, $rows);

    jsonOk(['airports' => $airports]);

} catch (PDOException $e) {
    jsonError('Query failed: ' . $e->getMessage(), 500);
}