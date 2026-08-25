<?php
if ( file_exists( __DIR__ . '/vendor/autoload.php' ) ) {
    require_once __DIR__ . '/vendor/autoload.php';
}

/**
 * 1. УПРАВЛЕНИЕ ПРОФИЛЕМ ПОЛЬЗОВАТЕЛЯ (АДМИНКА)
 */
add_action('show_user_profile', 'westman_extra_user_profile_fields');
add_action('edit_user_profile', 'westman_extra_user_profile_fields');

function westman_extra_user_profile_fields($user) { 
    $total_seconds = (int) get_the_author_meta('total_time_spent_seconds', $user->ID);
    $hours = floor($total_seconds / 3600);
    $minutes = floor(($total_seconds / 60) % 60);
    $time_formatted = "{$hours}h {$minutes}m";
    ?>
    <h3>Westman Configurator Extra Info</h3>
    <table class="form-table">
        <tr>
            <th><label for="user_phone">Phone Number</label></th>
            <td>
                <input type="text" name="user_phone" id="user_phone" value="<?php echo esc_attr(get_the_author_meta('user_phone', $user->ID)); ?>" class="regular-text" /><br />
                <span class="description">Current Phone Number.</span>
            </td>
        </tr>
        <tr>
            <th><label for="westman_access_code">RSM Activation Code</label></th>
            <td>
                <input type="text" name="westman_access_code" id="westman_access_code" value="<?php echo esc_attr(get_the_author_meta('westman_access_code', $user->ID)); ?>" class="regular-text" /><br />
                <span class="description">RSM Code</span>
            </td>
        </tr>
        <tr>
            <th><label>Referral Email</label></th>
            <td>
                <code><?php echo esc_html(get_the_author_meta('referral_email', $user->ID)); ?></code><br />
                <span class="description">Assigned office email (Auto-updates on save if code is valid)</span>
            </td>
        </tr>
        <tr>
            <th><label>Usage Statistics</label></th>
            <td>
                <ul>
                    <li><strong>Total Logins:</strong> <?php echo esc_html(get_the_author_meta('login_count', $user->ID) ?: 0); ?></li>
                    <li><strong>Last Login:</strong> <?php echo esc_html(get_the_author_meta('last_login_time', $user->ID) ?: 'Never'); ?></li>
                    <li><strong>Time in App:</strong> <?php echo $time_formatted; ?> (<?php echo $total_seconds; ?> seconds)</li>
                </ul>
            </td>
        </tr>
    </table>
<?php }

add_action('personal_options_update', 'westman_save_extra_user_profile_fields');
add_action('edit_user_profile_update', 'westman_save_extra_user_profile_fields');

function westman_save_extra_user_profile_fields($user_id) {
    if (!current_user_can('edit_user', $user_id)) {
        return false;
    }
    update_user_meta($user_id, 'user_phone', sanitize_text_field($_POST['user_phone']));
    
    if (isset($_POST['westman_access_code'])) {
        $code = sanitize_text_field($_POST['westman_access_code']);
        update_user_meta($user_id, 'westman_access_code', $code);
        
        $valid_codes = westman_get_office_codes();
        if (array_key_exists($code, $valid_codes)) {
            update_user_meta($user_id, 'referral_email', $valid_codes[$code]);
        }
    }
}

/**
 * 1.1 КАСТОМНЫЕ КОЛОНКИ В ТАБЛИЦЕ ПОЛЬЗОВАТЕЛЕЙ
 */
add_filter('manage_users_columns', 'westman_add_user_columns');
function westman_add_user_columns($columns) {
    $columns['westman_code'] = 'Access Code';
    $columns['westman_referral'] = 'Referral Email';
    $columns['westman_logins'] = 'Logins';
    $columns['westman_time'] = 'Time Spent';
    return $columns;
}

add_filter('manage_users_custom_column', 'westman_fill_user_columns', 10, 3);
function westman_fill_user_columns($val, $column_name, $user_id) {
    switch ($column_name) {
        case 'westman_code':
            return get_user_meta($user_id, 'westman_access_code', true);
        case 'westman_referral':
            return get_user_meta($user_id, 'referral_email', true);
        case 'westman_logins':
            return get_user_meta($user_id, 'login_count', true) ?: '0';
        case 'westman_time':
            $sec = (int) get_user_meta($user_id, 'total_time_spent_seconds', true);
            $h = floor($sec / 3600);
            $m = floor(($sec / 60) % 60);
            return "{$h}h {$m}m";
        default:
            return $val;
    }
}

/**
 * 1.2 СТРАНИЦА АНАЛИТИКИ И СИСТЕМНОГО МОНИТОРИНГА
 */
add_action('admin_menu', 'westman_analytics_menu');
function westman_analytics_menu() {
    add_menu_page(
        'Configurator Analytics', 
        '3D Analytics', 
        'manage_options', 
        'westman-analytics', 
        'westman_analytics_page_render', 
        'dashicons-chart-area', 
        6
    );
}

function westman_get_cached_user_html($uid, &$cache) {
    if ($uid == 0) return 'Guest';
    
    if (!isset($cache[$uid])) {
        $user_obj = get_userdata($uid);
        if ($user_obj) {
            $u_name = trim(get_user_meta($uid, 'first_name', true) . ' ' . get_user_meta($uid, 'last_name', true));
            if (empty($u_name)) $u_name = $user_obj->display_name;
            
            $cache[$uid] = [
                'name'  => $u_name,
                'email' => $user_obj->user_email,
                'code'  => get_user_meta($uid, 'westman_access_code', true),
                'ref'   => get_user_meta($uid, 'referral_email', true)
            ];
        } else {
            $cache[$uid] = false;
        }
    }

    $u = $cache[$uid];
    if (!$u) return "Deleted User (ID: $uid)";

    $html = esc_html($u['name']) . '<br><a href="mailto:'.esc_attr($u['email']).'">'.esc_html($u['email']).'</a>';
    $display_code = $u['code'] ? esc_html($u['code']) : 'N/A';
    $display_ref = $u['ref'] ? esc_html($u['ref']) : 'N/A';
    $html .= '<br><small style="color:#2271b1; font-weight:bold;">Code: ' . $display_code . '</small>';
    $html .= '<br><small style="color:#666;">Ref: ' . $display_ref . '</small>';
    
    return $html;
}

function westman_analytics_page_render() {
    $upload_dir = wp_upload_dir();
    $events_log_file = $upload_dir['basedir'] . '/analytics_logs/events.log';
    $health_log_file = $upload_dir['basedir'] . '/analytics_logs/system_health.log';
    
    $raw_combined_events = [];
    $unique_logged_users = [];
    $user_cache = [];
    
    $stats = [
        'app_open' => 0,
        'submission_started' => 0,
        'submission_completed' => 0,
        'system_errors' => 0
    ];

    $unique_users_by_event = [
        'app_open' => [],
        'submission_started' => [],
        'submission_completed' => []
    ];

    if (file_exists($events_log_file)) {
        $lines = file($events_log_file, FILE_IGNORE_NEW_LINES | FILE_SKIP_EMPTY_LINES);
        foreach ($lines as $line) {
            $data = json_decode($line, true);
            if ($data) {
                $uid = $data['user_id'] ?? 0;
                $evt = $data['event'] ?? 'unknown';
                $time = $data['timestamp'] ?? $data['server_time'] ?? '';
                
                if (empty($uid) && $evt === 'time_spent') {
                    continue; 
                }

                $raw_combined_events[] = [
                    'sort_time'   => $time,
                    'user_id'     => $uid,
                    'event_class' => 'business_event',
                    'event_type'  => $evt,
                    'geo'         => $data['geo'] ?? null,
                    'browser'     => $data['browser'] ?? null,
                    'device_type' => $data['device_type'] ?? null,
                    'resolution'  => $data['screen_resolution'] ?? null,
                    'properties'  => $data['properties'] ?? [],
                    'url'         => '',
                    'stack'       => null
                ];

                if (isset($stats[$evt])) {
                    $stats[$evt]++;
                    if (!isset($unique_users_by_event[$evt][$uid])) {
                        $unique_users_by_event[$evt][$uid] = 0;
                    }
                    $unique_users_by_event[$evt][$uid]++;
                }
            }
        }
    }

    if (file_exists($health_log_file)) {
        $lines = file($health_log_file, FILE_IGNORE_NEW_LINES | FILE_SKIP_EMPTY_LINES);
        foreach ($lines as $line) {
            $data = json_decode($line, true);
            if ($data) {
                $uid = $data['user_id'] ?? 0;
                $type = $data['type'] ?? 'info';
                $time = $data['server_time'] ?? '';

                if ($type === 'error' || $type === 'console_error') {
                    $stats['system_errors']++;
                }

                $raw_combined_events[] = [
                    'sort_time'   => $time,
                    'user_id'     => $uid,
                    'event_class' => 'system_log',
                    'event_type'  => $type,
                    'geo'         => null,
                    'browser'     => null,
                    'device_type' => null,
                    'resolution'  => null,
                    'properties'  => ['msg' => $data['message'] ?? ''],
                    'url'         => $data['url'] ?? '',
                    'stack'       => $data['stack'] ?? null
                ];
            }
        }
    }

    usort($raw_combined_events, function($a, $b) {
        return strcmp($b['sort_time'], $a['sort_time']);
    });

    $final_events_slice = array_slice($raw_combined_events, 0, 1000);

    foreach ($final_events_slice as $ev) {
        $uid = $ev['user_id'];
        if (!in_array($uid, $unique_logged_users)) {
            $unique_logged_users[] = $uid;
        }
    }

    $conversion_rate = $stats['app_open'] > 0 ? round(($stats['submission_completed'] / $stats['app_open']) * 100, 1) : 0;
    ?>
    <style>
        .stat-card { background:#fff; border:1px solid #ccc; padding:15px; border-radius:4px; width:180px; text-align:center; cursor:pointer; transition: all 0.2s ease; box-shadow: 0 1px 3px rgba(0,0,0,0.05); }
        .stat-card:hover { transform: translateY(-2px); box-shadow: 0 4px 8px rgba(0,0,0,0.1); border-color:#999; }
        .stat-card h3 { margin-top:0; font-size:14px; text-transform:uppercase; color:#555; }
        .stat-card .val { font-size:32px; font-weight:bold; }
        
        .admin-modal-overlay { display: none; position: fixed; top: 0; left: 0; width: 100%; height: 100%; background: rgba(0,0,0,0.6); z-index: 100000; justify-content: center; align-items: center; }
        .admin-modal-content { background: #fff; padding: 20px; border-radius: 6px; width: 90%; max-width: 700px; max-height: 80vh; overflow-y: auto; position: relative; box-shadow: 0 10px 30px rgba(0,0,0,0.2); }
        .admin-modal-close { position: absolute; top: 15px; right: 20px; cursor: pointer; font-size: 24px; font-weight: bold; color: #555; border: none; background: transparent; }
        .admin-modal-close:hover { color: #d11241; }
        
        .filter-container { background: #fff; border: 1px solid #ccc; padding: 15px; border-radius: 4px; margin-top: 25px; box-shadow: 0 1px 3px rgba(0,0,0,0.05); display: flex; align-items: center; gap: 15px; }
        .filter-container label { font-weight: bold; color: #333; }
        .filter-container select { padding: 6px 10px; min-width: 250px; border-radius: 4px; border: 1px solid #8c8f94; }
        
        .badge-sys { padding: 3px 6px; border-radius: 3px; font-size: 10px; font-weight: bold; text-transform: uppercase; color: #fff; }
        .badge-sys.err { background: #d11241; }
        .badge-sys.warn { background: #f56e28; }
        .badge-sys.info { background: #2271b1; }
        .badge-sys.biz { background: #46b450; }
    </style>

    <div class="wrap">
        <div style="display: flex; justify-content: space-between; align-items: center; margin-top: 20px; margin-bottom: 20px;">
            <h1 class="wp-heading-inline" style="margin:0;">3D Configurator Analytics & System Logs</h1>
            <button id="btn-logout-everyone" class="button button-secondary" style="background: #d11241; color: #fff; border-color: #b00f35; font-weight: bold; padding: 5px 15px; height: auto;">
                <span class="dashicons dashicons-warning" style="margin-top:2px;"></span> Logoff Everyone
            </button>
        </div>
        
        <div style="display:flex; gap: 20px; margin-top: 20px; flex-wrap: wrap;">
            <div class="stat-card" onclick="openModal('modal_app_open')">
                <h3>Configurator Opens</h3>
                <div class="val" style="color:#2271b1;"><?php echo $stats['app_open']; ?></div>
                <div style="font-size:10px; color:#888; margin-top:5px;">Click to see users</div>
            </div>
            <div class="stat-card" onclick="openModal('modal_submission_started')">
                <h3>Quote Started</h3>
                <div class="val" style="color:#f56e28;"><?php echo $stats['submission_started']; ?></div>
                <div style="font-size:10px; color:#888; margin-top:5px;">Click to see users</div>
            </div>
            <div class="stat-card" onclick="openModal('modal_submission_completed')">
                <h3>Quote Submitted</h3>
                <div class="val" style="color:#46b450;"><?php echo $stats['submission_completed']; ?></div>
                <div style="font-size:10px; color:#888; margin-top:5px;">Click to see users</div>
            </div>
            <div class="stat-card" style="cursor:default;">
                <h3>Conversion Rate</h3>
                <div class="val" style="color:#333;"><?php echo $conversion_rate; ?>%</div>
                <div style="font-size:10px; color:#888; margin-top:5px;">Opens to Submit</div>
            </div>
            <div class="stat-card" style="cursor:default; border-color:#d11241;">
                <h3>Console Errors</h3>
                <div class="val" style="color:#d11241;"><?php echo $stats['system_errors']; ?></div>
                <div style="font-size:10px; color:#888; margin-top:5px;">Total JS/API crashes</div>
            </div>
        </div>

        <div class="filter-container">
            <label for="user-log-filter"><span class="dashicons dashicons-filter" style="margin-top:1px;"></span> Choose The User:</label>
            <select id="user-log-filter">
                <option value="all">— All Users —</option>
                <?php 
                foreach ($unique_logged_users as $user_id) {
                    if ($user_id == 0) {
                        echo '<option value="user-id-0">Guest (Неавторизованные гости)</option>';
                        continue;
                    }
                    $u_data = get_userdata($user_id);
                    if ($u_data) {
                        $first_name = get_user_meta($user_id, 'first_name', true);
                        $last_name  = get_user_meta($user_id, 'last_name', true);
                        $display_name = trim($first_name . ' ' . $last_name);
                        if (empty($display_name)) {
                            $display_name = $u_data->display_name;
                        }
                        echo '<option value="user-id-' . $user_id . '">' . esc_html($display_name) . ' (' . esc_html($u_data->user_email) . ')</option>';
                    } else {
                        echo '<option value="user-id-' . $user_id . '">Удаленный пользователь (ID: ' . $user_id . ')</option>';
                    }
                }
                ?>
            </select>
        </div>

        <div style="display: flex; justify-content: space-between; align-items: center; margin-top: 30px; margin-bottom: 10px;">
            <h2 style="margin: 0;">Combined Stream Log (Last 1000 actions & system events)</h2>
            <button id="download-csv-btn" class="button button-primary">Download CSV</button>
        </div>

        <table id="analytics-table" class="wp-list-table widefat fixed striped" style="cursor: pointer;">
            <thead>
                <tr>
                    <th onclick="sortTable(0)" style="width:150px;">Time (Local) &#x21D5;</th>
                    <th onclick="sortTable(1)" style="width:180px;">User Info &#x21D5;</th>
                    <th onclick="sortTable(2)" style="width:140px;">Event / Type &#x21D5;</th>
                    <th onclick="sortTable(3)">Environment / Page Context &#x21D5;</th>
                    <th onclick="sortTable(4)">Payload & Exception Stack Trace &#x21D5;</th>
                </tr>
            </thead>
            <tbody>
                <?php if (empty($final_events_slice)): ?>
                    <tr><td colspan="5">No logs found yet.</td></tr>
                <?php else: ?>
                    <?php foreach ($final_events_slice as $ev): 
                        $uid = $ev['user_id'];
                        $user_info = westman_get_cached_user_html($uid, $user_cache);

                        if ($ev['event_class'] === 'business_event') {
                            $geo_str = 'Unknown Location';
                            if (isset($ev['geo']) && is_array($ev['geo']) && !isset($ev['geo']['error'])) {
                                $city   = !empty($ev['geo']['city'])   ? $ev['geo']['city']   : 'Unknown City';
                                $region = !empty($ev['geo']['region']) ? $ev['geo']['region'] : 'Unknown Region';
                                $ip     = !empty($ev['geo']['ip'])     ? $ev['geo']['ip']     : 'No IP';
                                $geo_str = "{$city}, {$region} ({$ip})";
                            }                       
                            $browser_str = esc_html($ev['browser'] ?? 'Unknown Browser');
                            $device_str = esc_html($ev['device_type'] ?? 'Desktop');
                            $screen_str = esc_html($ev['resolution'] ?? '');
                            $context_combined = "<strong>$device_str</strong> ($screen_str) | $browser_str<br>" . esc_html($geo_str);
                        } else {
                            $context_combined = '<span class="dashicons dashicons-admin-links" style="font-size:14px; width:14px; height:14px; margin-top:2px;"></span> <a href="'.esc_url($ev['url']).'" target="_blank" style="word-break:break-all;">' . esc_html($ev['url']) . '</a>';
                        }

                        $raw_type = $ev['event_type'];
                        if ($ev['event_class'] === 'business_event') {
                            $event_labels = [
                                'app_open'             => 'App Opened',
                                'submission_started'   => 'Quote Started',
                                'submission_completed' => 'Quote Submitted',
                                'time_spent'           => 'Session Closed',
                                'login_success'        => 'Logged In',
                                'registration_success' => 'Registered',
                                'logout'               => 'Logged Out',
                                'configuration_saved'  => 'Config Saved',
                                'file_exported'        => 'File Exported'
                            ];
                            $display_type = '<span class="badge-sys biz">' . ($event_labels[$raw_type] ?? ucwords(str_replace('_', ' ', $raw_type))) . '</span>';
                        } else {
                            if ($raw_type === 'error' || $raw_type === 'console_error') {
                                $display_type = '<span class="badge-sys err"><span class="dashicons dashicons-dismiss" style="font-size:11px; width:11px; height:11px; color:#fff; margin-right:2px; margin-top:1px;"></span>' . esc_html($raw_type) . '</span>';
                            } elseif ($raw_type === 'page_load') {
                                $display_type = '<span class="badge-sys info">Page Load</span>';
                            } else {
                                $display_type = '<span class="badge-sys info">' . esc_html($raw_type) . '</span>';
                            }
                        }

                        $extra_html = '';
                        if ($ev['event_class'] === 'business_event') {
                            if ($raw_type === 'time_spent' && isset($ev['properties']['duration_seconds'])) {
                                $sec = (int)$ev['properties']['duration_seconds'];
                                $extra_html = "<strong>Duration:</strong> " . floor($sec / 60) . "m " . ($sec % 60) . "s";
                            } elseif (!empty($ev['properties'])) {
                                foreach($ev['properties'] as $k => $v) {
                                    $extra_html .= esc_html("$k: $v") . '<br>';
                                }
                            }
                        } else {
                            $extra_html = '<strong>Message:</strong> ' . esc_html($ev['properties']['msg'] ?? '');
                            if (!empty($ev['stack'])) {
                                $extra_html .= '<br><details style="margin-top:5px; background:#fff3f3; padding:5px; border-radius:3px; border:1px solid #ffcccc;"><summary style="color:#d11241; font-weight:bold; font-size:10px;">View Stack Trace</summary><pre style="font-size:10px; margin:5px 0 0 0; white-space:pre-wrap; word-break:break-all; color:#555;">' . esc_html($ev['stack']) . '</pre></details>';
                            }
                        }

                        $raw_time = $ev['sort_time'];
                    ?>
                    <tr class="log-row" data-user="user-id-<?php echo $uid; ?>" style="<?php if($ev['event_class'] === 'system_log' && ($raw_type==='error' || $raw_type==='console_error')) echo 'background-color: #fff5f5;'; ?>">
                        <td class="local-time-cell" data-sort="<?php echo esc_attr($raw_time); ?>"><?php echo esc_html($raw_time); ?></td>
                        <td><?php echo $user_info; ?></td>
                        <td><?php echo $display_type; ?></td>
                        <td><?php echo $context_combined; ?></td>
                        <td><small><?php echo $extra_html; ?></small></td>
                    </tr>
                    <?php endforeach; ?>
                <?php endif; ?>
            </tbody>
        </table>
    </div>

    <?php
    $modal_titles = [
        'app_open' => 'Users who opened the Configurator',
        'submission_started' => 'Users who started a Quote',
        'submission_completed' => 'Users who submitted a Quote'
    ];

    foreach ($unique_users_by_event as $evt_key => $users_array) {
        arsort($users_array);
        ?>
        <div id="modal_<?php echo $evt_key; ?>" class="admin-modal-overlay">
            <div class="admin-modal-content">
                <button class="admin-modal-close" onclick="closeModal('modal_<?php echo $evt_key; ?>')">&times;</button>
                <h2><?php echo $modal_titles[$evt_key]; ?></h2>
                <hr>
                <table class="wp-list-table widefat fixed striped">
                    <thead>
                        <tr>
                            <th>User Info</th>
                            <th style="width:120px;">Times Performed</th>
                        </tr>
                    </thead>
                    <tbody>
                        <?php if (empty($users_array)): ?>
                            <tr><td colspan="2">No data yet.</td></tr>
                        <?php else: ?>
                            <?php foreach ($users_array as $uid => $count): ?>
                            <tr>
                                <td><?php echo westman_get_cached_user_html($uid, $user_cache); ?></td>
                                <td><span style="font-size:18px; font-weight:bold;"><?php echo $count; ?></span></td>
                            </tr>
                            <?php endforeach; ?>
                        <?php endif; ?>
                    </tbody>
                </table>
            </div>
        </div>
        <?php
    }
    ?>

    <script>
    document.getElementById('user-log-filter').addEventListener('change', function() {
        const selectedValue = this.value;
        const rows = document.querySelectorAll('.log-row');
        
        rows.forEach(row => {
            if (selectedValue === 'all') {
                row.style.display = ''; 
            } else {
                if (row.getAttribute('data-user') === selectedValue) {
                    row.style.display = ''; 
                } else {
                    row.style.display = 'none'; 
                }
            }
        });
    });

    document.getElementById('btn-logout-everyone').addEventListener('click', function() {
        if (!confirm('Вы уверены, что хотите принудительно разлогинить ВСЕХ пользователей системы прямо сейчас?')) {
            return;
        }
        
        const button = this;
        button.disabled = true;
        button.innerText = 'Processing...';

        fetch('/wp-json/configurator/v1/logout-everyone', {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
                'X-WP-Nonce': '<?php echo wp_create_nonce("wp_rest"); ?>'
            }
        })
        .then(response => response.json())
        .then(data => {
            if (data.success) {
                alert('Успешно! Все сессии пользователей аннулированы. Их разлогинит при следующем клике.');
            } else {
                alert('Ошибка: ' + (data.message || 'Unknown error'));
            }
        })
        .catch(err => {
            console.error(err);
            alert('Сбой при отправке запроса на server.');
        })
        .finally(() => {
            button.disabled = false;
            button.innerHTML = '<span class="dashicons dashicons-warning" style="margin-top:2px;"></span> Logoff Everyone';
        });
    });

    function openModal(id) {
        document.getElementById(id).style.display = 'flex';
    }
    function closeModal(id) {
        document.getElementById(id).style.display = 'none';
    }
    window.onclick = function(event) {
        if (event.target.classList.contains('admin-modal-overlay')) {
            event.target.style.display = "none";
        }
    }

    document.addEventListener("DOMContentLoaded", function() {
        document.querySelectorAll('.local-time-cell').forEach(function(cell) {
            let ts = cell.getAttribute('data-sort');
            if (ts) {
                if (!ts.includes('T') && !ts.includes('Z')) {
                    ts = ts.replace(' ', 'T') + 'Z'; 
                }
                let date = new Date(ts);
                if (!isNaN(date.getTime())) {
                    cell.innerHTML = date.toLocaleString();
                }
            }
        });
    });

    function sortTable(n) {
        var table, rows, switching, i, x, y, shouldSwitch, dir, switchcount = 0;
        table = document.getElementById("analytics-table");
        switching = true;
        dir = "asc"; 
        while (switching) {
            switching = false;
            rows = table.rows;
            for (i = 1; i < (rows.length - 1); i++) {
                shouldSwitch = false;
                x = rows[i].getElementsByTagName("TD")[n];
                y = rows[i + 1].getElementsByTagName("TD")[n];
                
                let valX = x.getAttribute("data-sort") || x.innerHTML.toLowerCase();
                let valY = y.getAttribute("data-sort") || y.innerHTML.toLowerCase();

                if (dir == "asc") {
                    if (valX > valY) {
                        shouldSwitch = true;
                        break;
                    }
                } else if (dir == "desc") {
                    if (valX < valY) {
                        shouldSwitch = true;
                        break;
                    }
                }
            }
            if (shouldSwitch) {
                rows[i].parentNode.insertBefore(rows[i + 1], rows[i]);
                switching = true;
                switchcount ++;
            } else {
                if (switchcount == 0 && dir == "asc") {
                    dir = "desc";
                    switching = true;
                }
            }
        }
    }

    document.getElementById("download-csv-btn").addEventListener("click", function () {
        var html = document.querySelector("#analytics-table").outerHTML;
        export_table_to_csv(html, "3d_configurator_analytics.csv");
    });

    function export_table_to_csv(html, filename) {
        var csv = [];
        var rows = document.querySelectorAll("#analytics-table tr");
        
        for (var i = 0; i < rows.length; i++) {
            var row = [], cols = rows[i].querySelectorAll("td, th");
            
            for (var j = 0; j < cols.length; j++) {
                let data = cols[j].innerText || cols[j].textContent;
                data = data.replace(/(\r\n|\n|\r)/gm, " | ");
                data = data.replace(/"/g, '""');
                row.push('"' + data.trim() + '"');
            }
            csv.push(row.join(","));
        }

        download_csv(csv.join("\n"), filename);
    }

    function download_csv(csv, filename) {
        var csvFile;
        var downloadLink;
        var BOM = "\uFEFF"; 
        csvFile = new Blob([BOM + csv], {type: "text/csv;charset=utf-8;"});
        downloadLink = document.createElement("a");
        downloadLink.download = filename;
        downloadLink.href = window.URL.createObjectURL(csvFile);
        downloadLink.style.display = "none";
        document.body.appendChild(downloadLink);
        downloadLink.click();
        document.body.removeChild(downloadLink);
    }
    </script>
    <?php
}

/**
 * 2. ПОДКЛЮЧЕНИЕ АССЕТОВ И НАСТРОЙКИ СТРАНИЦЫ
 */
add_action('wp_enqueue_scripts', 'westman_enqueue_configurator_assets', 999);

function westman_enqueue_configurator_assets() {
    if (is_page_template('template-configurator.php')) {
        wp_dequeue_style('wp-block-library');
        wp_dequeue_style('global-styles');
        wp_dequeue_style('classic-theme-styles');
    }
}

remove_action('wp_head', 'print_emoji_detection_script', 7);
remove_action('wp_print_styles', 'print_emoji_styles');

add_action('wp_head', function() {
    if (is_page_template('template-configurator.php')) {
        echo "<script>
            var wpApiSettings = {
                root: '" . esc_url_raw(rest_url()) . "',
                nonce: '" . wp_create_nonce('wp_rest') . "',
                themeUrl: '" . esc_url_raw(get_template_directory_uri()) . "'
            };
        </script>";
    }
}, 1);

add_action('wp', function() {
    if (is_page_template('template-configurator.php')) {
        add_filter('show_admin_bar', '__return_false');
    }
});

/**
 * 3. РЕГИСТРАЦИЯ МАРШРУТОВ REST API
 */
add_action('rest_api_init', function () {
    $namespace = 'configurator/v1';

    register_rest_route($namespace, '/logout', [
        'methods' => 'POST',
        'callback' => 'westman_api_logout_user',
        'permission_callback' => function () { return is_user_logged_in(); }
    ]);

    register_rest_route($namespace, '/delete', [
        'methods' => 'POST',
        'callback' => 'westman_delete_config',
        'permission_callback' => function () { return is_user_logged_in(); }
    ]);

    register_rest_route($namespace, '/save', [
        'methods' => 'POST',
        'callback' => 'westman_save_config',
        'permission_callback' => function () { return is_user_logged_in(); }
    ]);

    register_rest_route($namespace, '/history', [
        'methods' => 'GET',
        'callback' => 'westman_get_history',
        'permission_callback' => function () { return is_user_logged_in(); }
    ]);

    register_rest_route($namespace, '/verify-code', [
        'methods' => 'POST',
        'callback' => 'westman_api_verify_code',
        'permission_callback' => '__return_true'
    ]);

    register_rest_route($namespace, '/register', [
        'methods' => 'POST',
        'callback' => 'westman_api_register_user',
        'permission_callback' => '__return_true'
    ]);

    register_rest_route($namespace, '/login', [
        'methods' => 'POST',
        'callback' => 'westman_api_login_user',
        'permission_callback' => '__return_true'
    ]);

    register_rest_route($namespace, '/submit-request', [
        'methods' => 'POST',
        'callback' => 'westman_submit_to_gf_direct',
        'permission_callback' => '__return_true'
    ]);

    register_rest_route($namespace, '/log-event', [
        'methods' => 'POST',
        'callback' => 'westman_api_log_event',
        'permission_callback' => '__return_true'
    ]);

    register_rest_route($namespace, '/logout-everyone', [
        'methods'             => 'POST',
        'callback'            => 'westman_api_logout_everyone',
        'permission_callback' => function () { 
            return current_user_can('manage_options');
        }
    ]);

    register_rest_route($namespace, '/log-system-status', [
        'methods'             => 'POST',
        'callback'            => 'westman_api_log_system_status',
        'permission_callback' => '__return_true'
    ]);
});

/**
 * 4. ВСПОМОГАТЕЛЬНЫЕ ФУНКЦИИ И ОБРАБОТЧИКИ
 */
function westman_get_office_codes() {
    return [
        'O@42@uL7xFikB$xVr)lc)I(u' => 'insidesalesbc@westmansteel.ca',
        '3o69JFNAoF265!^)9lJwDGxj' => 'orderdesksk@westmansteel.ca',
        'KOdnsv)i*ZwGIw5G)LZcqEoz' => 'OrderDeskAB@westmansteel.ca',
        'UAkHoWHtzwAzGUqTuQ#x@yeA' => 'OrderDeskMB@westmansteel.ca',
        '!pXKOgbyLnZ0^OD!IboEPPlg' => 'sales@scotiametal.ca',
        'x5L*uKr3NAEIl)6)ws6JL(BL' => '',
        'LPNoo)8tdFswJ%)1mFTMwgkQ' => '',
        'nQQnItYPsb77N)Zu$t9zV#uA' => '',
        'pOt2Bov0a1gkRhdfXkt2vK&k' => '',
        'Qg2^8Vnxjwp3rNEIP8SvyzTN' => ''
    ];
}

function westman_submit_to_gf_direct($request) {
    if (!class_exists('GFAPI')) {
        return new WP_Error('no_gf', 'Gravity Forms API not found', ['status' => 500]);
    }

    $params = $request->get_json_params();
    $form_id = 1;
    $user_id = get_current_user_id();

    $recipient_email = sanitize_text_field($params['recipient'] ?? '');

    $project_url = add_query_arg([
        'load_project' => 0,
        'user_id'      => $user_id
    ], home_url('/'));

    $input_values = [
        'input_1'  => sanitize_text_field($params['name'] ?? ''),
        'input_3'  => sanitize_email($params['email'] ?? ''),
        'input_4'  => sanitize_text_field($params['phone'] ?? ''),
        'input_5'  => sanitize_textarea_field($params['summary'] ?? ''),
        'input_7'  => esc_url_raw($project_url),
        'input_9'  => $recipient_email,
        'input_10' => sanitize_textarea_field($params['comments'] ?? ''),
        'input_11' => sanitize_text_field($params['contact_code'] ?? ''),
        'input_12' => esc_url_raw($params['pdf_link'] ?? '')
    ];

    $result = GFAPI::submit_form($form_id, $input_values);

    if (isset($result['is_valid']) && $result['is_valid']) {
        // Логирование отправки письма конкретному дилеру
        $upload_dir = wp_upload_dir();
        $log_dir = $upload_dir['basedir'] . '/analytics_logs';
        if (!file_exists($log_dir)) {
            wp_mkdir_p($log_dir);
        }
        $gf_log = [
            'event'       => 'lead_routed',
            'server_time' => current_time('mysql'),
            'user_id'     => $user_id,
            'properties'  => [
                'recipient_email' => $recipient_email ?: 'Default Office'
            ]
        ];
        file_put_contents($log_dir . '/events.log', json_encode($gf_log) . PHP_EOL, FILE_APPEND);

        return rest_ensure_response([
            'success'  => true,
            'entry_id' => $result['entry_id']
        ]);
    } else {
        return new WP_Error('gf_error', 'Submission failed.', ['status' => 500]);
    }
}

function westman_save_config($request) {
    $user_id = get_current_user_id();
    $payload = $request->get_json_params(); 
    $history = get_user_meta($user_id, 'config_history', true) ?: [];
    array_unshift($history, $payload);
    $history = array_slice($history, 0, 5);
    update_user_meta($user_id, 'config_history', $history);

    $upload_dir = wp_upload_dir();
    $log_dir = $upload_dir['basedir'] . '/analytics_logs';
    if (!file_exists($log_dir)) {
        wp_mkdir_p($log_dir);
    }
    $save_log = [
        'event'       => 'configuration_saved',
        'server_time' => current_time('mysql'),
        'user_id'     => $user_id
    ];
    file_put_contents($log_dir . '/events.log', json_encode($save_log) . PHP_EOL, FILE_APPEND);

    return rest_ensure_response(['status' => 'success']);
}

function westman_get_history($request) {
    $requested_user_id = $request->get_param('user_id');
    
    if ($requested_user_id && current_user_can('manage_options')) {
        $user_id = intval($requested_user_id);
    } else {
        $user_id = get_current_user_id();
    }

    $history = get_user_meta($user_id, 'config_history', true);
    return rest_ensure_response(['history' => is_array($history) ? $history : []]);
}

function westman_api_verify_code($request) {
    $code = sanitize_text_field($request->get_param('code'));
    if (empty($code)) {
        return new WP_Error('empty_code', 'Please enter an access code.', ['status' => 400]);
    }
    $valid_codes = westman_get_office_codes();
    if (!array_key_exists($code, $valid_codes)) {
        return new WP_Error('invalid_code', 'This code is invalid.', ['status' => 403]);
    }
    return rest_ensure_response(['status' => 'success', 'message' => 'Code verified.']);
}

function westman_api_register_user($request) {
    $params = $request->get_json_params();
    
    $code       = sanitize_text_field($params['code']);
    $first_name = sanitize_text_field($params['first_name']);
    $last_name  = sanitize_text_field($params['last_name']);
    $email      = sanitize_email($params['email']);
    $password   = $params['password'];
    $phone      = sanitize_text_field($params['phone']);

    $valid_codes = westman_get_office_codes();
    if (!array_key_exists($code, $valid_codes)) {
        return new WP_Error('invalid_code', 'Code is invalid.', ['status' => 403]);
    }
    
    $referral_email = $valid_codes[$code];

    if (empty($first_name) || empty($last_name)) {
        return new WP_Error('empty_names', 'Please provide your first and last name.', ['status' => 400]);
    }

    if (!is_email($email) || email_exists($email)) {
        return new WP_Error('invalid_email', 'Email invalid or already exists.', ['status' => 400]);
    }

    $user_id = wp_create_user($email, $password, $email);
    if (is_wp_error($user_id)) return $user_id;

    update_user_meta($user_id, 'first_name', $first_name);
    update_user_meta($user_id, 'last_name', $last_name);
    update_user_meta($user_id, 'westman_access_code', $code);
    update_user_meta($user_id, 'referral_email', $referral_email);
    update_user_meta($user_id, 'user_phone', $phone);

    wp_update_user([
        'ID'           => $user_id,
        'first_name'   => $first_name,
        'last_name'    => $last_name,
        'display_name' => $first_name . ' ' . $last_name
    ]);

    wp_set_current_user($user_id);
    wp_set_auth_cookie($user_id, true);

    return rest_ensure_response(['status' => 'success', 'message' => 'Registration complete.']);
}

function westman_api_login_user($request) {
    $email    = sanitize_email($request->get_param('email'));
    $password = $request->get_param('password');

    if (empty($email) || empty($password)) {
        return new WP_Error('empty_fields', 'Please provide email and password.', ['status' => 400]);
    }

    $user = wp_authenticate($email, $password);
    if (is_wp_error($user)) {
        return new WP_Error('invalid_credentials', 'Invalid email or password.', ['status' => 403]);
    }

    wp_set_current_user($user->ID);
    wp_set_auth_cookie($user->ID, true);

    $login_count = (int) get_user_meta($user->ID, 'login_count', true);
    update_user_meta($user->ID, 'login_count', $login_count + 1);
    update_user_meta($user->ID, 'last_login_time', current_time('mysql'));

    $user_type = ($login_count === 0) ? 'new_user' : 'returning_user';
    $upload_dir = wp_upload_dir();
    $log_dir = $upload_dir['basedir'] . '/analytics_logs';
    if (!file_exists($log_dir)) {
        wp_mkdir_p($log_dir);
    }
    $login_log_params = [
        'event'       => 'user_login_session',
        'server_time' => current_time('mysql'),
        'user_id'     => $user->ID,
        'properties'  => [
            'user_type' => $user_type
        ]
    ];
    file_put_contents($log_dir . '/events.log', json_encode($login_log_params) . PHP_EOL, FILE_APPEND);

    return rest_ensure_response(['status' => 'success', 'message' => 'Logged in successfully.']);
}

function westman_api_log_event($request) {
    $params = $request->get_json_params();
    
    if (empty($params)) {
        $params = json_decode($request->get_body(), true);
    }

    $user_id = is_user_logged_in() ? get_current_user_id() : 0;
    
    if ($user_id === 0 && isset($params['event']) && $params['event'] === 'time_spent') {
        return rest_ensure_response(['success' => true]);
    }

    $params['server_time'] = current_time('mysql');
    $params['user_id'] = $user_id;

    if ($user_id && isset($params['event']) && $params['event'] === 'time_spent') {
        $duration = isset($params['properties']['duration_seconds']) ? (int)$params['properties']['duration_seconds'] : 0;
        $total_time = (int) get_user_meta($user_id, 'total_time_spent_seconds', true);
        update_user_meta($user_id, 'total_time_spent_seconds', $total_time + $duration);
    }

    $upload_dir = wp_upload_dir();
    $log_dir = $upload_dir['basedir'] . '/analytics_logs';
    if (!file_exists($log_dir)) {
        wp_mkdir_p($log_dir);
    }
    
    $log_file = $log_dir . '/events.log';
    file_put_contents($log_file, json_encode($params) . PHP_EOL, FILE_APPEND);

    return rest_ensure_response(['success' => true]);
}

function westman_handle_pdf_upload() {
    @ini_set('memory_limit', '512M');
    @set_time_limit(300);

    if ( ! isset( $_REQUEST['_ajax_nonce'] ) || ! wp_verify_nonce( $_REQUEST['_ajax_nonce'], 'wp_rest' ) ) {
        if ( ! check_ajax_referer( 'westman_upload_pdf', '_ajax_nonce', false ) ) {
            wp_send_json_error( array( 'message' => 'Invalid nonce security check.' ) );
            exit;
        }
    }

    $layout_html = isset($_POST['layout_html']) ? stripslashes($_POST['layout_html']) : '';

    if (empty($layout_html)) {
        wp_send_json_error(array('message' => 'HTML payload is empty.'));
        exit;
    }

    $upload_dir = wp_upload_dir();
    $log_dir = $upload_dir['basedir'] . '/analytics_logs';
    if (!file_exists($log_dir)) {
        wp_mkdir_p($log_dir);
    }
    $export_log = [
        'event'       => 'file_exported',
        'server_time' => current_time('mysql'),
        'user_id'     => is_user_logged_in() ? get_current_user_id() : 0,
        'properties'  => ['format' => 'pdf']
    ];
    file_put_contents($log_dir . '/events.log', json_encode($export_log) . PHP_EOL, FILE_APPEND);

    $layout_html = '<div class="container">' . $layout_html . '</div>';

    $layout_html = preg_replace('/class="([^"]*)specs-grid([^"]*)"/', 'class="$1row g-3 mb-4$2"', $layout_html);
    $layout_html = preg_replace('/class="([^"]*)adv-panel([^"]*)"/', 'class="$1row g-3 mb-4$2"', $layout_html);
    $layout_html = preg_replace('/class="([^"]*)elevations-grid([^"]*)"/', 'class="$1row g-3 mb-4$2"', $layout_html);
    $layout_html = preg_replace('/class="([^"]*)s-row([^"]*)"/', 'class="$1mb-3$2"', $layout_html);

    $block_counter = 1;
    $layout_html = preg_replace_callback('/class="([^"]*spec-box[^"]*)"/', function($matches) use (&$block_counter) {
        $old_classes = $matches[1];
        $col_class = (strpos($old_classes, 'adv-panel') !== false) ? 'col-md-3' : 'col-md-4';
        
        $html = 'class="' . str_replace('spec-box', $col_class . ' ', $old_classes) . '" id="blockID-' . $block_counter . '"';
        $block_counter++;
        return $html;
    }, $layout_html);

    $card_counter = 1;
    $layout_html = preg_replace_callback('/class="([^"]*el-card[^"]*)"/', function($matches) use (&$card_counter) {
        $old_classes = $matches[1];
        $html = 'class="' . str_replace('el-card', 'col-md-4 text-center p-3', $old_classes) . '" id="cardID-' . $card_counter . '"';
        $card_counter++;
        return $html;
    }, $layout_html);

    $layout_html = preg_replace('/class="([^"]*)el-img-container([^"]*)"/', 'class="$1d-flex align-items-center justify-content-center bg-light rounded mb-2$2" style="height: 200px;"', $layout_html);

    $img_counter = 1;
    $layout_html = preg_replace_callback('/<img([^>]*)>/', function($matches) use (&$img_counter) {
        $clean_match = preg_replace('/id="[^"]*"/', '', $matches[1]);
        $clean_match = preg_replace('/class="[^"]*"/', '', $clean_match);
        
        $html = '<img id="imgID-' . $img_counter . '" class="img-fluid object-fit-contain" ' . $clean_match . '>';
        $img_counter++;
        return $html;
    }, $layout_html);

    $mpdf_override_styles = '
    <link rel="stylesheet" href="https://cdn.jsdelivr.net/npm/bootstrap@5.3.2/dist/css/bootstrap.min.css">
    <link rel="stylesheet" href="https://cdn.jsdelivr.net/npm/bootstrap-icons@1.11.1/font/bootstrap-icons.css">
    <style>
        body {
            font-family: Arial, sans-serif !important;
            background-color: #fff;
            margin: 0;
            padding-top: 75px;
        }
        .print-control-panel {
            position: fixed;
            top: 0;
            left: 0;
            width: 100%;
            height: 65px;
            background-color: #212529;
            z-index: 1050;
            border-bottom: 2px solid #343a40;
        }
        @media print {
            .print-control-panel, .btn-print-page {
                display: none !important;
            }
            body {
                background-color: #fff !important;
                color: #000 !important;
                padding-top: 0 !important;
            }
            .container, .container-fluid {
                max-width: 100% !important;
                width: 100% !important;
                padding: 0 !important;
                margin: 0 !important;
            }
        }
        .header img {max-width: 120px !important; margin: 1rem 0 !important;}
        .header h1 {font-size: 14px !important; }
        h2 {font-size: 22px !important; font-weight: 600 !important;}        
        .iso-wrapper {
          display: flex;
        }
        .iso-img-container {
          flex: 0 0 33.3333%;
          max-width: 33.3333%;
          padding: 1rem;
        }
        .iso-dims-list {
          flex: 0 0 66.6666%;
          max-width: 66.6666%;
          padding: 1rem;
        }
    </style>
    <div class="print-control-panel d-flex align-items-center shadow-sm">
        <div class="container d-flex justify-content-between align-items-center">
            <span class="fw-bold fs-5 text-white m-0">Westman Steel &mdash; 3D Project Blueprint</span>
            <button onclick="window.print();" class="btn btn-danger btn-print-page fw-bold d-flex align-items-center gap-2 px-4 py-2" style="background-color: #d11241; border-color: #d11241;">
                <i class="bi bi-printer-fill"></i> Print / Save as PDF
            </button>
        </div>
    </div>
    ';

    $final_html = $mpdf_override_styles . $layout_html;
    $final_html = str_replace('filter: brightness(0);', '', $final_html);

    $base_dir = $upload_dir['basedir'] . '/westman-quotes';
    if (!file_exists($base_dir)) {
        wp_mkdir_p($base_dir);
    }

    $unique_id = uniqid() . '_' . time();
    $html_filename = 'Blueprint_' . $unique_id . '.html';
    $html_filepath = $base_dir . '/' . $html_filename;
    
    if (file_put_contents($html_filepath, $final_html) !== false) {
        wp_send_json_success(array(
            'url'      => $upload_dir['baseurl'] . '/westman-quotes/' . $html_filename,
            'html_url' => $upload_dir['baseurl'] . '/westman-quotes/' . $html_filename
        ));
        exit;
    } else {
        wp_send_json_error(array('message' => 'Failed to write HTML file to disk.'));
        exit;
    }
}

add_action('wp_ajax_westman_upload_pdf', 'westman_handle_pdf_upload');
add_action('wp_ajax_nopriv_westman_upload_pdf', 'westman_handle_pdf_upload');

function westman_custom_pdf_upload_dir($dirs) {
    $custom_dir = '/westman-quotes';
    $dirs['subdir'] = $custom_dir;
    $dirs['path']   = $dirs['basedir'] . $custom_dir;
    $dirs['url']    = $dirs['baseurl'] . $custom_dir;
    return $dirs;
}

function westman_api_logout_user() {
    wp_logout();
    return rest_ensure_response([
        'status'  => 'success',
        'message' => 'User logged out successfully.'
    ]);
}

/**
 * 5. ПРИНУДИТЕЛЬНЫЙ ВЫХОД ПОЛЬЗОВАТЕЛЯ (LOGOFF ЧЕРЕЗ 1 ЧАС ПОСЛЕ ЛОГИНА)
 */
add_action('wp_login', 'westman_set_login_timestamp', 10, 2);
function westman_set_login_timestamp($user_login, $user) {
    update_user_meta($user->ID, 'westman_exact_login_timestamp', time());
}

add_action('init', 'westman_enforce_one_hour_session_limit');
function westman_enforce_one_hour_session_limit() {
    if (!is_user_logged_in()) {
        return;
    }

    $user_id = get_current_user_id();
    $login_time = (int) get_user_meta($user_id, 'westman_exact_login_timestamp', true);

    if (empty($login_time)) {
        update_user_meta($user_id, 'westman_exact_login_timestamp', time());
        return;
    }

    $current_time = time();
    $one_hour_in_seconds = 3600;

    if (($current_time - $login_time) > $one_hour_in_seconds) {
        delete_user_meta($user_id, 'westman_exact_login_timestamp');
        wp_logout();
        wp_redirect(wp_login_url() . '?loggedout=true&session_expired=1');
        exit;
    }
}

/**
 * 6. ОЧИСТКА КЭША И СБРОС ВЕРСИЙ СКРИПТОВ / СТИЛЕЙ ПРИ ВЫХОДЕ (БЕЗ ОЧИСТКИ STORAGE)
 */
add_action('wp_logout', 'westman_clear_cache_on_logout');
function westman_clear_cache_on_logout() {
    if (function_exists('wp_cache_flush')) {
        wp_cache_flush();
    }

    header("Cache-Control: no-store, no-cache, must-revalidate, max-age=0");
    header("Cache-Control: post-check=0, pre-check=0", false);
    header("Pragma: no-cache");
    header('Clear-Site-Data: "cache", "executionContexts"'); 
}

add_filter('style_loader_src', 'westman_invalidate_assets_version', 9999);
add_filter('script_loader_src', 'westman_invalidate_assets_version', 9999);
function westman_invalidate_assets_version($src) {
    if (isset($_GET['loggedout']) || isset($_GET['session_expired'])) {
        $src = remove_query_arg('ver', $src);
        $src = add_query_arg('ver', time(), $src);
    }
    return $src;
}

/**
 * 7. МАССОВЫЙ ВЫХОД И КОРРЕКТНЫЙ СБОР СИСТЕМНЫХ ЛОГОВ/ОШИБОК
 */
function westman_api_logout_everyone() {
    global $wpdb;
    $wpdb->query("DELETE FROM {$wpdb->usermeta} WHERE meta_key = 'session_tokens'");
    update_option('westman_force_global_logout_ts', time());

    return rest_ensure_response([
        'success' => true,
        'message' => 'All user sessions have been invalidated.'
    ]);
}

add_action('init', 'westman_with_forced_global_check');
function westman_with_forced_global_check() {
    if (!is_user_logged_in()) {
        return;
    }

    $user_id = get_current_user_id();
    $global_logout_ts = (int) get_option('westman_force_global_logout_ts', 0);
    $user_login_ts = (int) get_user_meta($user_id, 'westman_exact_login_timestamp', true);

    if ($global_logout_ts > 0 && $user_login_ts < $global_logout_ts) {
        wp_logout();
        wp_redirect(wp_login_url() . '?loggedout=true&forced_global=1');
        exit;
    }
}

function westman_api_log_system_status($request) {
    $params = $request->get_json_params();
    if (empty($params)) {
        $params = json_decode($request->get_body(), true);
    }

    $user_id = is_user_logged_in() ? get_current_user_id() : 0;
    
    $log_data = [
        'server_time' => current_time('mysql'),
        'user_id'     => $user_id,
        'url'         => esc_url_raw($params['url'] ?? ''),
        'type'        => sanitize_text_field($params['type'] ?? 'info'),
        'message'     => sanitize_textarea_field($params['message'] ?? ''),
        'stack'       => isset($params['stack']) ? sanitize_textarea_field($params['stack']) : null,
        'user_agent'  => $_SERVER['HTTP_USER_AGENT'] ?? 'Unknown'
    ];

    $upload_dir = wp_upload_dir();
    $log_dir = $upload_dir['basedir'] . '/analytics_logs';
    if (!file_exists($log_dir)) {
        wp_mkdir_p($log_dir);
    }
    
    $log_file = $log_dir . '/system_health.log';
    file_put_contents($log_file, json_encode($log_data) . PHP_EOL, FILE_APPEND);

    return rest_ensure_response(['success' => true]);
}

/**
 * 8. ДОПОЛНИТЕЛЬНЫЙ ТРЕКИНГ ДЛЯ PDF-ОТЧЕТА
 */
add_action('wp_login_failed', 'westman_track_failed_login');
function westman_track_failed_login($username) {
    $upload_dir = wp_upload_dir();
    $log_dir = $upload_dir['basedir'] . '/analytics_logs';
    if (!file_exists($log_dir)) {
        wp_mkdir_p($log_dir);
    }
    
    $params = [
        'event'       => 'failed_login_attempt',
        'server_time' => current_time('mysql'),
        'user_id'     => 0,
        'properties'  => [
            'attempted_username' => sanitize_text_field($username),
            'ip'                 => $_SERVER['REMOTE_ADDR'] ?? ''
        ]
    ];

    file_put_contents($log_dir . '/events.log', json_encode($params) . PHP_EOL, FILE_APPEND);
}

add_action('retrieve_password', 'westman_track_password_reset');
function westman_track_password_reset($user_login) {
    $upload_dir = wp_upload_dir();
    $log_dir = $upload_dir['basedir'] . '/analytics_logs';
    if (!file_exists($log_dir)) {
        wp_mkdir_p($log_dir);
    }

    $user = get_user_by('login', $user_login);
    if (!$user) {
        $user = get_user_by('email', $user_login);
    }

    $params = [
        'event'       => 'password_reset_request',
        'server_time' => current_time('mysql'),
        'user_id'     => $user ? $user->ID : 0,
        'properties'  => [
            'user_login' => sanitize_text_field($user_login)
        ]
    ];

    file_put_contents($log_dir . '/events.log', json_encode($params) . PHP_EOL, FILE_APPEND);
}
?>