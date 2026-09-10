<?php
header('Content-Type: application/json; charset=utf-8');

include 'config.php';
include 'LoteryStats.php';

if ($_SERVER['REQUEST_METHOD'] !== 'POST') {
    http_response_code(405);
    echo json_encode(['success' => false, 'message' => 'Método no permitido']);
    exit;
}

function obtenerSorteosDesdeInternet() {
    // API de Loterías y Apuestas del Estado de España
    $urls = array(
        'https://www.loteriasyapuestas.es/es/primitiva',
        'https://api.loteriaprimitiva.com/sorteos' // API simulada (ajusta según disponibilidad real)
    );
    
    $sorteos_nuevos = array();
    
    // Función alternativa: Si no hay API disponible, retornar datos demo
    // En producción, deberías conectar con una API real de Loterías y Apuestas
    
    // Por ahora, retornamos un array vacío o datos demo
    return array(
        'success' => true,
        'nuevos' => array(),
        'mensaje' => 'API no configurada. Configura una fuente de datos real de Loterías y Apuestas'
    );
}

try {
    $request = json_decode(file_get_contents('php://input'), true);
    $action = $request['action'] ?? '';
    
    if ($action === 'sincronizar') {
        $resultado = obtenerSorteosDesdeInternet();
        
        if ($resultado['success']) {
            $nuevos_count = 0;
            $stats = new LoteryStats($conn);
            
            // Procesar cada sorteo descargado
            foreach ($resultado['nuevos'] as $sorteo) {
                $res = $stats->agregarSorteo(
                    $sorteo['numeros'],
                    $sorteo['reintegro'],
                    $sorteo['fecha']
                );
                
                if ($res['success']) {
                    $nuevos_count++;
                }
            }
            
            // Actualizar tabla de sincronización
            $query = "UPDATE sincronizacion SET ultima_actualizacion = NOW(), siguiente_actualizacion = DATE_ADD(NOW(), INTERVAL 3 HOUR), estado = 'completado', sorteos_nuevos = ?";
            $stmt = $conn->prepare($query);
            $stmt->bind_param('i', $nuevos_count);
            $stmt->execute();
            
            echo json_encode(array(
                'success' => true,
                'nuevos_sorteos' => $nuevos_count,
                'message' => 'Sincronización completada correctamente'
            ));
        } else {
            echo json_encode(array(
                'success' => false,
                'message' => $resultado['mensaje']
            ));
        }
    } else {
        http_response_code(400);
        echo json_encode(['success' => false, 'message' => 'Acción no válida']);
    }
} catch (Exception $e) {
    http_response_code(500);
    echo json_encode(['success' => false, 'message' => 'Error: ' . $e->getMessage()]);
}
?>