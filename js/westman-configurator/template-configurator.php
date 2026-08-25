<?php /* Template Name: 3D Configurator */ ?>
<!DOCTYPE html>
<html lang="en">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>Westman Steel - 3D Configurator</title>
    <link href="<?php echo get_template_directory_uri(); ?>/assets/bootstrap.min.css" rel="stylesheet">
    <link href="<?php echo get_template_directory_uri(); ?>/assets/style.css" rel="stylesheet">
    <link rel="stylesheet" href="https://cdn.jsdelivr.net/npm/bootstrap-icons@1.11.1/font/bootstrap-icons.css">
    <script src="https://cdnjs.cloudflare.com/ajax/libs/jspdf/2.5.1/jspdf.umd.min.js"></script>
    <script src="https://cdnjs.cloudflare.com/ajax/libs/html2canvas/1.4.1/html2canvas.min.js"></script>

    <!-- ЕДИНСТВЕННЫЙ IMPORTMAP ДЛЯ ВСЕХ МОДУЛЕЙ THREE.JS (ВСЕ ВЕРСИИ СИНХРОНИЗИРОВАНЫ) -->
    <script type="importmap">
    {
        "imports": {
            "three": "https://cdn.jsdelivr.net/npm/three@0.160.0/build/three.module.js",
            "three/addons/": "https://cdn.jsdelivr.net/npm/three@0.160.0/examples/jsm/",
            "three-mesh-bvh": "https://cdn.jsdelivr.net/npm/three-mesh-bvh@0.7.0/build/index.module.js",
            "three-bvh-csg": "https://cdn.jsdelivr.net/npm/three-bvh-csg@0.0.16/build/index.module.js"
        }
    }
    </script>

    <?php wp_head(); ?>
</head>
<body>
<?php if (!is_user_logged_in()) { ?>
<div id="auth-overlay" style="position:fixed; top:0; left:0; width:100vw; height:100vh; background:rgba(0,0,0,0.9); z-index:99999; display:flex; justify-content:center; align-items:center;">
    <div class="card p-4 shadow-lg" style="width: 100%; max-width: 400px; border-radius: 8px;">
        <div class="text-center mb-3">
            <img src="<?php echo get_template_directory_uri(); ?>/assets/logotype-estimator.svg" alt="Logo" style="height:40px;">
            <h5 class="mt-3 fw-bold">System Access</h5>
        </div>

        <ul class="nav nav-tabs nav-fill mb-3" id="authTabs" role="tablist">
            <li class="nav-item" role="presentation">
                <button class="nav-link active fw-bold" id="login-tab" data-bs-toggle="tab" data-bs-target="#login-pane" type="button" role="tab" style="color:#222;">Log In</button>
            </li>
            <li class="nav-item" role="presentation">
                <button class="nav-link fw-bold" id="register-tab" data-bs-toggle="tab" data-bs-target="#register-pane" type="button" role="tab" style="color:#222;">Register</button>
            </li>
        </ul>

        <div class="tab-content">
            <div class="tab-pane fade show active" id="login-pane" role="tabpanel">
                <div id="login-form-block">
                    <label class="form-label fw-bold small">Email Address</label>
                    <input type="email" id="login-email" class="form-control mb-3" placeholder="name@company.com">
                    
                    <label class="form-label fw-bold small">Password</label>
                    <div class="input-group mb-2">
                        <input type="password" id="login-password" class="form-control" placeholder="Enter password">
                        <button class="btn btn-outline-secondary toggle-password" type="button" data-target="login-password">
                            <i class="bi bi-eye"></i>
                        </button>
                    </div>
                    
                    <div class="text-end mb-3">
                        <a href="#" id="link-show-reset" class="text-decoration-none small text-secondary fw-bold">Forgot Password?</a>
                    </div>
                    
                    <button id="btn-login" class="btn btn-primary w-100 fw-bold">Log In</button>
                    <div id="login-error" class="text-danger small mt-2 fw-bold text-center"></div>
                </div>

                <div id="reset-form-block" style="display: none;">
                    <div class="alert alert-secondary p-2 small mb-3" style="font-size: 11px;">
                        <i class="bi bi-shield-lock-fill text-danger"></i> Complete all fields below. Our automated system will double-verify your credentials to authorize an immediate password update without email delays.
                    </div>

                    <label class="form-label fw-bold small">Email Address</label>
                    <input type="email" id="reset-email" class="form-control mb-2" placeholder="name@company.com">

                    <label class="form-label fw-bold small">Invitation Code</label>
                    <input type="text" id="reset-invitation-code" class="form-control mb-2" placeholder="Enter your unique registration code">

                    <label class="form-label fw-bold small">Secret Word / Answer</label>
                    <input type="text" id="reset-secret-word" class="form-control mb-2" placeholder="Enter your security answer">

                    <label class="form-label fw-bold small">New Password</label>
                    <div class="input-group mb-1">
                        <input type="password" id="reset-new-password" class="form-control" placeholder="Create strong password">
                        <button class="btn btn-outline-secondary toggle-password" type="button" data-target="reset-new-password">
                            <i class="bi bi-eye"></i>
                        </button>
                    </div>
                    <div class="text-muted mb-3" style="font-size: 10px;">Must contain: 8+ characters, 1 uppercase, 1 number, 1 special character.</div>

                    <div class="d-flex gap-2 mt-3">
                        <button id="btn-cancel-reset" class="btn btn-outline-dark w-50 fw-bold btn-sm">Back</button>
                        <button id="btn-submit-reset" class="btn btn-outline-dark w-50 fw-bold btn-sm">Reset Password</button>
                    </div>
                    <div id="reset-error" class="text-danger small mt-2 fw-bold text-center"></div>
                    <div id="reset-success" class="text-success small mt-2 fw-bold text-center"></div>
                </div>
            </div>

            <div class="tab-pane fade" id="register-pane" role="tabpanel">
                <div id="auth-step-1">
                    <label class="form-label fw-bold small">Invitation Code</label>
                    <input type="text" id="reg-code" class="form-control mb-3" placeholder="Enter your unique code">
                    <button id="btn-verify-code" class="btn btn-secondary w-100 fw-bold">Verify Code</button>
                    <div id="code-error" class="text-danger small mt-2 fw-bold text-center"></div>
                </div>
                
                <div id="auth-step-2" style="display:none;">
                    <div class="alert alert-success p-2 small mb-3"><i class="bi bi-check-circle-fill"></i> Code verified! Create account.</div>
                    
                    <div class="row g-2 mb-2">
                        <div class="col-6">
                            <label class="form-label fw-bold small">First Name</label>
                            <input type="text" id="reg-firstname" class="form-control" placeholder="First Name">
                        </div>
                        <div class="col-6">
                            <label class="form-label fw-bold small">Last Name</label>
                            <input type="text" id="reg-lastname" class="form-control" placeholder="Last Name">
                        </div>
                    </div>

                    <label class="form-label fw-bold small">Email Address</label>
                    <input type="email" id="reg-email" class="form-control mb-2" placeholder="name@company.com">
                    
                    <label class="form-label fw-bold small">Phone Number</label>
                    <input type="tel" id="reg-phone" class="form-control mb-2" placeholder="204-XXX-XXXX">
                    
                    <div class="p-2 border rounded mb-2 bg-light">
                        <label class="form-label fw-bold small text-dark mb-0">Secret Word / Security Answer</label>
                        <div class="text-muted mb-1" style="font-size: 9.5px; line-height: 1.2;">Used to securely recover profile access and bypass standard email verification in case of unexpected lockouts. Keep this private.</div>
                        <input type="text" id="reg-secret-word" class="form-control form-control-sm" placeholder="e.g., Mother's maiden name or first pet">
                    </div>

                    <label class="form-label fw-bold small">Password</label>
                    <div class="input-group mb-1">
                        <input type="password" id="reg-password" class="form-control" placeholder="Minimum 8 characters">
                        <button class="btn btn-outline-secondary toggle-password" type="button" data-target="reg-password">
                            <i class="bi bi-eye"></i>
                        </button>
                    </div>
                    <div class="text-muted mb-2" style="font-size: 10px;">Must contain: 1 uppercase, 1 number, 1 special character (!@#$%^&*).</div>
                    
                    <label class="form-label fw-bold small">Confirm Password</label>
                    <div class="input-group mb-3">
                        <input type="password" id="reg-password-confirm" class="form-control" placeholder="Confirm password">
                        <button class="btn btn-outline-secondary toggle-password" type="button" data-target="reg-password-confirm">
                            <i class="bi bi-eye"></i>
                        </button>
                    </div>
                    
                    <button id="btn-register" class="btn btn-success w-100 fw-bold">Create Account</button>
                    <div id="reg-error" class="text-danger small mt-2 fw-bold text-center"></div>
                </div>
            </div>
        </div>
    </div>
</div>
<?php } else { ?>

<div id="terms-click-blocker" style="display: none;"></div>
<div id="terms-bottom-banner" class="shadow-lg" style="display: none;">
    <div class="terms-banner-content">
        <h5 class="fw-bold text-dark mb-3">
            <i class="bi bi-shield-lock-fill me-2" style="color: #d11241;"></i>Estimating App Terms and Conditions
        </h5>
        <p>Westman Steel’s estimating app is provided for convenience only and is intended to assist dealers and contractors in preparing preliminary estimates and submitting order information. Westman Steel makes no representation or warranty, express or implied, as to the accuracy, completeness, or suitability of any estimate, calculation, measurement, quantity, color, size, delivery date, or other project information generated by or submitted through the app.</p>
        <p>It is the sole responsibility of the dealer and/or contractor to verify all measurements, quantities, specifications, colors, sizes, delivery requirements, and other project details before authorizing production. Westman Steel shall not be liable for any errors, omissions, or discrepancies arising from information entered into or transmitted through the app, whether caused by the dealer, contractor, or any third party.</p>
        <p>Following submission of an order, Westman Steel will issue an order confirmation. It is the responsibility of the dealer to ensure that Westman Steel has accurate and current contact information to receive such confirmations. The dealer must review the order confirmation promptly and acknowledge acceptance in writing by email, referencing both the Westman Steel sales order number and the dealer purchase order number.</p>
        <p>If Westman Steel does not receive written acknowledgment of the order confirmation prior to production, Westman Steel may proceed on the basis that the confirmed order details are correct. Any discrepancy, error, or omission not identified and confirmed in writing prior to production shall be the sole responsibility of the dealer and, where applicable, the dealer’s associated buying group. In such cases, the dealer and/or buying group shall be responsible for payment of the invoice in full.</p>
        <p><strong>Please note: The default panel length generated by the estimating app is 6 feet. This dimension must be confirmed with the plant prior to placing your final order.</strong></p>
    </div>
    <div class="terms-banner-actions">
        <div class="text-muted small d-none d-md-block">Use of the estimating app constitutes acceptance of these terms.</div>
        <div class="d-flex gap-2">
            <button id="btn-decline-terms" class="btn btn-outline-secondary fw-bold px-4">Decline</button>
            <button id="btn-accept-terms" class="btn btn-success fw-bold px-5" style="background-color: #d11241; border-color: #d11241;">Accept All</button>
        </div>
    </div>
</div>

<div id="logo-container">
    <span>
        <img src="<?php echo get_template_directory_uri(); ?>/assets/logotype-estimator.svg" class="logo" alt="Westman Steel"/>
    </span>
</div>
<div id="canvas-container" style="position: relative;">
    <div id="dist-overlay" style="display:none; position:absolute; top:20px; left:50%; transform:translateX(-50%); background:rgba(0,0,0,0.8); color:#fff; padding:6px 12px; border-radius:4px; pointer-events:none; z-index:9999; font-weight:bold; box-shadow: 0 4px 6px rgba(0,0,0,0.3);"></div>

    <div id="view-controls">
        <button class="btn btn-sm btn-outline-light" onclick="window.setCameraView('top')">Top</button>
        <button class="btn btn-sm btn-outline-light" onclick="window.setCameraView('front')">Front</button>
        <button class="btn btn-sm btn-outline-light" onclick="window.setCameraView('back')">Back</button>
        <button class="btn btn-sm btn-outline-light" onclick="window.setCameraView('left')">Left</button>
        <button class="btn btn-sm btn-outline-light" onclick="window.setCameraView('right')">Right</button>
        <div class="vr bg-white mx-1"></div>
        <button class="btn btn-sm btn-warning" onclick="window.setCameraView('reset')"><i class="bi bi-camera-video"></i> Reset Cam</button>
        <button class="btn btn-sm btn-danger" id="btn-reset-building"><i class="bi bi-arrow-counterclockwise"></i> Reset Bld</button>
    </div>
</div>

<div id="ui-panel">
    <div class="user-profile-header bg-dark p-3 text-white">
        <?php
        $current_user = wp_get_current_user();
        $first_name = get_user_meta($current_user->ID, 'first_name', true);
        $last_name  = get_user_meta($current_user->ID, 'last_name', true);
        $full_name = trim($first_name . ' ' . $last_name);
        if (empty($full_name)) {
            $full_name = $current_user->display_name;
        }
        $display_name = esc_html($full_name);
        $user_email   = esc_html($current_user->user_email);
        $user_phone = get_user_meta($current_user->ID, 'user_phone', true);
        ?>
        <div class="d-flex align-items-start w-100">
            <div class="me-2 d-flex justify-content-center" <?php if (is_user_logged_in()) { echo 'title="User ID: ' . get_current_user_id() . '"'; } ?>>
                <i class="bi bi-person-circle fs-5 text-white-50"></i>
            </div>
            <div class="flex-grow-1">
                <div class="d-flex justify-content-between align-items-center mb-1">
                    <div class="fw-bold lh-1"><?php echo $display_name; ?></div>
                    <button id="btn-logout" class="btn btn-sm btn-outline-light fw-light px-2 py-0 small">Log Off</button>
                </div>
                <div class="d-flex justify-content-between align-items-center text-white-50 lh-1 small">
                    <div><?php echo $user_email; ?></div>
                    <div id="ui-local-time" class="fw-bold text-warning small">--:--</div>
                </div>
            </div>
        </div>
    </div>

    <div class="p-3 border-bottom">
        <h3 class="section-title text-uppercase fw-bold mb-2">Building Architecture</h3>
        <select id="building-model-type" class="form-select form-select-sm mt-2">
            <option value="gambrel">Gambrel</option>
            <option value="hexagonal">Hexagonal (6-Sided)</option>
            <option value="hip_and_valley">Hip and Valley (Cross/T-Shape)</option>
            <option value="saltbox">Saltbox</option>
            <option value="shed">Shed</option>
            <option value="skillion_leanto">Skillion & Lean-to</option>
            <option value="standard" selected>Standard Gable</option>
        </select>

        <div class="mt-2">
            <label class="form-label fw-bold mb-1 small">A: Main Width (ft)</label>
            <input type="number" id="h-width" min="10" max="200" step="0.5" value="30" class="form-control form-control-sm">
        </div>
        <div class="mt-2">
            <label class="form-label fw-bold mb-1 small">B: Main Depth (ft)</label>
            <input type="number" id="h-depth" min="10" max="200" step="0.5" value="40" class="form-control form-control-sm">
        </div>
        <div class="mt-2">
            <label class="form-label fw-bold mb-1 small">Total Height (ft)</label>
            <input type="number" id="h-height" min="8" max="40" step="0.5" value="16" class="form-control form-control-sm">
        </div>
        <div class="mt-2">
            <label class="form-label fw-bold mb-1 small">Roof Pitch (X/12)</label>
            <input type="number" id="h-pitch" min="0" max="12" step="0.5" value="4" class="form-control form-control-sm">
        </div>
        <div id="upper-pitch-group" class="mt-2" style="display:none;">
            <label class="form-label fw-bold mb-1 small text-primary">Upper Pitch (X/12)</label>
            <input type="number" id="h-upperPitch" min="1" max="12" step="0.5" value="6" class="form-control form-control-sm">
        </div>
        <div id="hip-offset-group" class="mt-2" style="display:none;">
            <label class="form-label fw-bold mb-1 small">Hip Offset (ft)</label>
            <input type="number" id="h-hipOffset" min="0" max="50" step="0.5" value="0" class="form-control form-control-sm">
        </div>
    </div>

    <div class="p-3 border-bottom bg-white">
        <h3 class="section-title text-uppercase fw-bold mb-2">Options</h3>
        
        <div class="form-check form-switch mb-1">
            <input class="form-check-input" type="checkbox" id="vented-enable">
            <label class="form-check-label fw-bold small" for="vented-enable">Vented Roof</label>
        </div>
        <div id="vent-controls" style="display:none;" class="mb-2">
            <label class="form-label fw-bold mb-1 small">Cutback (inches)</label>
            <input type="number" id="h-vent-offset" min="0.5" max="2" step="0.5" value="0.5" class="form-control form-control-sm">
        </div>

        <div class="form-check form-switch mb-1">
            <input class="form-check-input" type="checkbox" id="oh-enable">
            <label class="form-check-label fw-bold small" for="oh-enable">Roof Overhang / Soffit</label>
        </div>
        <div id="overhang-controls" style="display: none;" class="mb-2">
            <label class="form-label fw-bold mb-1 small">Overhang Size (ft)</label>
            <input type="number" id="h-overhang" min="0.5" max="2.0" step="0.1" value="1.0" class="form-control form-control-sm mb-1">
            <label class="form-label fw-bold mb-1 small">Eave Extension (inches)</label>
            <input type="number" id="h-eave-ext" min="0" max="2" step="0.5" value="0" class="form-control form-control-sm mb-1">
            <label class="form-label fw-bold mb-1 small">Soffit Color</label>
            <select id="soffit-color" class="form-select form-select-sm"></select>
        </div>

        <div class="form-check form-switch mb-1">
            <input class="form-check-input" type="checkbox" id="gable-divider-enable">
            <label class="form-check-label fw-bold small" for="gable-divider-enable">Gable Divider</label>
        </div>
        <div id="gable-divider-controls" style="display:none;" class="mb-2">
            <label class="form-label fw-bold mb-1 small">Divider Color</label>
            <select id="gable-divider-color" class="form-select form-select-sm"></select>
        </div>

        <div class="form-check form-switch mb-1">
            <input class="form-check-input" type="checkbox" id="closures-enable" checked>
            <label class="form-check-label fw-bold small" for="closures-enable">Include Closures</label>
        </div>
    </div>
    
    <div class="p-3 border-bottom bg-white">
        <h3 class="section-title text-uppercase fw-bold mb-2">Floors & Trim</h3>
        <div class="form-check form-switch mb-1">
            <input class="form-check-input" type="checkbox" id="two-floors-enable">
            <label class="form-check-label fw-bold small" for="two-floors-enable">Enable 2nd Floor Split</label>
        </div>
        <div id="first-floor-controls" style="display:none;" class="mb-3 border-start border-3 border-primary ps-2">
            <label class="form-label fw-bold mb-1 small">First Floor Height (ft)</label>
            <input type="number" id="firstFloorHeight" min="1" max="20" step="0.5" value="10" class="form-control form-control-sm">
        </div>

        <div class="form-check form-switch mb-1 mt-2">
            <input class="form-check-input" type="checkbox" id="wainscot-enable">
            <label class="form-check-label fw-bold small" for="wainscot-enable">Enable Wainscot (Base)</label>
        </div>
        <div id="wainscot-controls" style="display:none;" class="mb-1 border-start border-3 border-secondary ps-2">
            <label class="form-label fw-bold mb-1 small">Wainscot Height (ft)</label>
            <input type="number" id="h-wainscotHeight" min="1" max="10" step="0.5" value="3" class="form-control form-control-sm">
        </div>
        
        <div class="mt-3 border-top pt-2">
            <label class="form-label fw-bold mb-1 small">Trim Length (ft)</label>
            <select id="h-trim-length" class="form-select form-select-sm">
                <option value="10.5" selected>10.5' (Standard)</option>
                <option value="10">10' (Scotia Metals Only)</option>
            </select>
        </div>

        <div class="mt-3 border-top pt-2">
            <h6 class="text-primary fw-bold small text-uppercase mb-2">Custom Trims / Extras</h6>
            <div id="custom-trims-container" class="mb-2"></div>
            <div class="row g-1">
                <div class="col-5">
                    <input type="text" id="ct-name" class="form-control form-control-sm" placeholder="Trim Name">
                </div>
                <div class="col-3">
                    <input type="number" id="ct-length" class="form-control form-control-sm" placeholder="Length" min="1" step="0.5">
                </div>
                <div class="col-2">
                    <input type="number" id="ct-qty" class="form-control form-control-sm" placeholder="Qty" min="1">
                </div>
                <div class="col-2">
                    <button id="btn-add-custom-trim" class="btn btn-sm btn-custom w-100 fw-bold">+</button>
                </div>
            </div>
        </div>
    </div>

    <div id="hip-valley-controls" class="p-3 border-bottom bg-white" style="display: block;">
        <h3 class="section-title text-uppercase fw-bold mb-2 text-primary">Hip & Valley Wings</h3>
        <div class="mt-2"><label class="form-label fw-bold mb-1 small">Left Wing Extension (ft)</label><input type="number" class="form-control form-control-sm" id="h-hvLeftExt" min="0" max="60" step="0.5" value="15"></div>
        <div class="mt-2 mb-3"><label class="form-label fw-bold mb-1 small text-danger">Left Pos (Shift Z)</label><input type="number" class="form-control form-control-sm" id="h-hvLeftOffset" min="-20" max="20" step="0.5" value="0"></div>
        <div class="mt-2 border-top pt-2"><label class="form-label fw-bold mb-1 small">Right Wing Extension (ft)</label><input type="number" class="form-control form-control-sm" id="h-hvRightExt" min="0" max="60" step="0.5" value="15"></div>
        <div class="mt-2"><label class="form-label fw-bold mb-1 small text-danger">Right Pos (Shift Z)</label><input type="number" class="form-control form-control-sm" id="h-hvRightOffset" min="-20" max="20" step="0.5" value="0"></div>
    </div>

    <div id="cross-hipped-controls" class="p-3 border-bottom bg-white" style="display: none;">
        <h3 class="section-title text-uppercase fw-bold mb-2 text-primary">Cross Wing Settings</h3>
        <div class="mt-2"><label class="form-label fw-bold mb-1 small">Wing Extension (ft)</label><input type="number" class="form-control form-control-sm" id="h-crossDepth" min="4" max="80" step="0.5" value="20"></div>
        <div class="mt-2"><label class="form-label fw-bold mb-1 small text-danger">Position (Shift Z)</label><input type="number" class="form-control form-control-sm" id="h-crossOffset" min="-40" max="40" step="0.5" value="0"></div>
    </div>

    <div id="leanto-controls" class="p-3 border-bottom bg-white" style="display: none;">
        <h3 class="section-title text-uppercase fw-bold mb-2 text-primary">Lean-to Dimensions</h3>
        <div class="mt-2"><label class="form-label fw-bold mb-1 small">Width (ft)</label><input type="number" class="form-control form-control-sm" id="h-leanToWidth" min="4" max="40" step="0.5" value="10"></div>
        <div class="mt-2"><label class="form-label fw-bold mb-1 small">Depth (ft)</label><input type="number" class="form-control form-control-sm" id="h-leanToDepth" min="4" max="100" step="0.5" value="20"></div>
        <div class="mt-2"><label class="form-label fw-bold mb-1 small">Wall Height (ft)</label><input type="number" class="form-control form-control-sm" id="h-leanToHeight" min="4" max="20" step="0.5" value="8"></div>
        <div class="mt-2"><label class="form-label fw-bold mb-1 small">Pitch (/12)</label><input type="number" class="form-control form-control-sm" id="h-leanToPitch" min="1" max="12" step="0.5" value="2"></div>
    </div>

    <div class="p-3 border-bottom bg-white">
        <h3 class="section-title text-uppercase fw-bold mb-2">Dormer Settings</h3>
        <div class="form-check form-switch mb-2"><input class="form-check-input" type="checkbox" id="d-enable"><label class="form-check-label fw-bold small" for="d-enable">Add Dormer</label></div>
        <div id="dormer-controls" style="display:none;">
            <div class="row g-2 mt-1">
                <div class="col-6"><label class="form-label fw-bold mb-1 small">Placement Side</label><select id="h-dormerSide" class="form-select form-select-sm"><option value="right">Right Roof</option><option value="left">Left Roof</option></select></div>
                <div class="col-6"><label class="form-label fw-bold mb-1 small">Roof Pitch (/12)</label><input type="number" id="h-dormerPitch" min="1" max="12" value="4" step="0.5" class="form-control form-control-sm"></div>
            </div>
            <div class="mt-2"><label class="form-label fw-bold mb-1 small">Width</label><input type="number" id="h-dormerWidth" min="4" max="13.3" value="6" step="0.5" class="form-control form-control-sm"></div>
            <div class="mt-2"><label class="form-label fw-bold mb-1 small">Depth (Slope X)</label><input type="number" id="h-dormerDepth" min="0.5" max="10" value="5" step="0.5" class="form-control form-control-sm"></div>
            <div class="mt-2"><label class="form-label fw-bold mb-1 small">Eave Height</label><input type="number" id="h-dormerHeight" min="16" max="21" value="18" step="0.5" class="form-control form-control-sm"></div>
            <div class="mt-2"><label class="form-label fw-bold mb-1 small">Position Z (Ridge)</label><input type="number" id="h-dormerZ" min="-17" max="17" value="0" step="0.5" class="form-control form-control-sm"></div>
        </div>
    </div>

    <div class="p-3 border-bottom">
        <h3 class="section-title text-uppercase fw-bold mb-2">Doors & Windows</h3>
        <select id="wd-wall" class="form-select form-select-sm mb-2">
            <option value="front">Main Front</option><option value="back">Main Back</option><option value="left">Left Wall</option><option value="right">Right Wall</option>
            <option value="left_front" style="display:none;">Main Left (Front Seg)</option><option value="left_back" style="display:none;">Main Left (Back Seg)</option>
            <option value="right_front" style="display:none;">Main Right (Front Seg)</option><option value="right_back" style="display:none;">Main Right (Back Seg)</option>
            <option value="wing_l_front" style="display:none;">Left Wing (Front)</option><option value="wing_l_back" style="display:none;">Left Wing (Back)</option><option value="wing_l_end" style="display:none;">Left Wing (End)</option>
            <option value="wing_r_front" style="display:none;">Right Wing (Front)</option><option value="wing_r_back" style="display:none;">Right Wing (Back)</option><option value="wing_r_end" style="display:none;">Right Wing (End)</option>
        </select>
        <div class="input-group input-group-sm mb-2">
            <select id="wd-type" class="form-select">
                <option value="window_1">Single Window (2x3)</option>
                <option value="window_2">Double Window (4x3)</option>
                <option value="window_3">Triple Window (6x3)</option>
                <option value="door_1">Single Door (3x7)</option>
                <option value="door_2">Double Door (6x7)</option>
                <option value="door_3">Overhead Door (8x7)</option>
                <option value="door_4">Overhead Door (16x7)</option>
            </select>
            <button id="btn-add-element" class="btn btn-custom fw-bold px-3">Add</button>
        </div>
        <button id="btn-clear-elements" class="btn btn-secondary btn-sm w-100 fw-bold mb-2">Clear Openings</button>

        <div id="opening-editor" class="p-3 mt-2 border rounded shadow-sm" style="display: none; background-color: #fff3f3; border-color: #dc3545 !important;">
            <h4 class="text-uppercase fw-bold mb-2 text-danger" style="font-size: 12px;">Edit Selected Element</h4>
            
            <div class="d-flex align-items-center mb-2">
                <div id="oe-svg" class="me-3" style="width: 40px; height: 40px; color: #dc3545;"></div>
                <div>
                    <div class="fw-bold text-dark" style="font-size: 14px;" id="oe-type-label">Window</div>
                    <div class="small text-muted">Current: <span id="oe-current-size" class="fw-bold">0 x 0</span> ft</div>
                </div>
            </div>

            <div id="oe-warning" class="alert alert-warning py-2 px-2 mb-3" style="font-size: 11px; display: none;">
                <i class="bi bi-exclamation-triangle-fill"></i> Non-standard CAD size!<br>
                Closest Standard: <strong id="oe-std-size"></strong>
                <button id="btn-apply-std" class="btn btn-sm btn-primary w-100 mt-2 fw-bold" style="font-size: 10px;">Apply Standard Size</button>
            </div>

            <div class="row mt-2 g-2">
                <div class="col-6">
                    <label class="form-label fw-bold mb-1 small">Width (ft)</label>
                    <input type="number" id="oe-width" min="1" max="30" step="0.5" value="2" class="form-control form-control-sm">
                </div>
                <div class="col-6">
                    <label class="form-label fw-bold mb-1 small">Height (ft)</label>
                    <input type="number" id="oe-height" min="1" max="20" step="0.5" value="3" class="form-control form-control-sm">
                </div>
            </div>
            
            <div class="mt-2 border-top pt-2">
                <label class="form-label fw-bold mb-1 small">Height from Floor (FFL, ft)</label>
                <input type="number" id="oe-ffl" min="0" max="30" step="0.5" value="0" class="form-control form-control-sm">
            </div>

            <div class="row mt-2 g-2">
                <div class="col-6">
                    <label class="form-label fw-bold mb-1 small text-muted">Dist Left (ft)</label>
                    <input type="text" id="oe-dist-l" class="form-control form-control-sm text-center" readonly style="background-color: #e9ecef;">
                </div>
                <div class="col-6">
                    <label class="form-label fw-bold mb-1 small text-muted">Dist Right (ft)</label>
                    <input type="text" id="oe-dist-r" class="form-control form-control-sm text-center" readonly style="background-color: #e9ecef;">
                </div>
            </div>

            <button id="btn-delete-opening" class="btn btn-outline-danger btn-sm w-100 mt-3 fw-bold">Delete Element</button>
        </div>
    </div>

    <div class="p-3 border-bottom bg-white">
        <h3 class="section-title text-uppercase fw-bold mb-2">Models & Colors</h3>
        
        <div class="form-check form-switch mb-3">
            <input class="form-check-input" type="checkbox" id="env-enable">
            <label class="form-check-label fw-bold small" for="env-enable">Enable Environment (Sky & Grass)</label>
        </div>
        
        <label class="form-label fw-bold mb-1 small">Roof Panel:</label>
        <div class="input-group input-group-sm">
            <select id="roof-panel-model" class="form-select"></select>
            <button id="btn-view-roof" class="btn btn-outline-secondary" type="button"><i class="bi bi-box-arrow-up-right"></i> View</button>
        </div>
        <div id="roof-coverage-options" class="mb-2 mt-1 text-muted"></div>

        <div id="ff-panel-group" style="display:none;">
            <label class="form-label fw-bold mb-1 small text-primary">First Floor Panel:</label>
            <div class="input-group input-group-sm mb-2">
                <select id="first-floor-panel-model" class="form-select"></select>
            </div>
        </div>
        
        <label class="form-label fw-bold mb-1 small d-flex justify-content-between align-items-center mt-2">
            Upper Wall Cladding:
            <div class="form-check form-switch m-0" style="font-size: 0.75rem;"><input class="form-check-input" type="checkbox" id="w-tex-rot"><label class="form-check-label">Horizontal</label></div>
        </label>
        <div class="input-group input-group-sm">
            <select id="wall-panel-model" class="form-select"></select>
            <button id="btn-view-wall" class="btn btn-outline-secondary" type="button"><i class="bi bi-box-arrow-up-right"></i> View</button>
        </div>
        <div id="wall-coverage-options" class="mb-2 mt-1 text-muted"></div>

        <div class="mt-2 mb-3">
            <label class="form-label fw-bold mb-1 small">Wall Panel Alignment:</label>
            <select id="h-panel-alignment" class="form-select form-select-sm">
                <option value="left" selected>Left</option>
                <option value="middle">Middle</option>
                <option value="right">Right</option>
            </select>
        </div>

        <div class="row g-2 mb-2 mt-2 border-top pt-2">
            <div class="col-12"><label class="form-label fw-bold mb-1 small">Roof Color:</label><select id="roof-color" class="form-select form-select-sm"></select></div>
            <div class="col-12"><label class="form-label fw-bold mb-1 small">Upper Wall/Gable:</label><select id="wall-color" class="form-select form-select-sm"></select></div>
            <div class="col-12" id="ff-color-group" style="display:none;"><label class="form-label fw-bold mb-1 small text-primary">First Floor Color:</label><select id="first-floor-color" class="form-select form-select-sm"></select></div>
            <div class="col-12"><label class="form-label fw-bold mb-1 small">Trim Color:</label><select id="trim-color" class="form-select form-select-sm"></select></div>
            <div class="col-12"><label class="form-label fw-bold mb-1 small">Wainscot Base:</label><select id="wainscot-color" class="form-select form-select-sm"></select></div>
        </div>
    </div>

    <div class="p-3 mb-4">
        <h3 class="section-title text-uppercase fw-bold mb-3">Material List & Specs</h3>
        <div class="d-flex justify-content-between info-row"><span>Roof Area:</span> <span id="spec-roof-area" class="fw-bold">-</span></div>
        <div class="d-flex justify-content-between info-row"><span>Wall Area:</span> <span id="spec-wall-area" class="fw-bold">-</span></div>
        <div class="d-flex justify-content-between info-row mt-2"><span>Roof Panels:</span> <span id="mat-roof-pcs" style="color:var(--primary);font-weight:bold; font-size:11px;">-</span></div>
        <div class="d-flex justify-content-between info-row"><span>Wall Panels:</span> <span id="mat-wall-pcs" class="fw-bold">-</span></div>
        <div class="d-flex justify-content-between info-row mt-2"><span>Ridge Caps:</span> <span id="mat-ridge" class="fw-bold">-</span></div>
        <div class="d-flex justify-content-between info-row" id="row-hip" style="display:none;"><span>Hip Trim:</span> <span id="mat-hip" class="fw-bold">-</span></div>
        
        <div class="d-flex justify-content-between info-row" id="row-butyl-tape" style="display:none;"><span>Butyl Tape (Roof):</span> <span id="mat-butyl-tape" class="fw-bold">-</span></div>
        
        <div class="d-flex justify-content-between info-row" id="row-clips" style="display:none;"><span>Roof Clips:</span> <span id="mat-clips" class="fw-bold" style="font-size:11px; color:#d11241;">-</span></div>
        <div class="d-flex justify-content-between info-row"><span>Fasteners:</span> <span id="mat-screws" class="fw-bold" style="font-size:11px;">-</span></div>
        
        <div id="spec-custom-trims-wrapper" style="display:none;" class="mt-2 border-top pt-2">
            <div class="fw-bold text-danger" style="font-size:11px;">CUSTOM TRIMS:</div>
            <div id="spec-custom-trims-list" style="font-size:11px;"></div>
        </div>

        <div id="request-btn-container" class="mt-4"></div>
        <button class="btn btn-dark w-100 fw-bold mt-2 shadow-sm" id="btn-print">Print Blueprint (PDF)</button>
        
        <div class="input-group mb-2 mt-3" id="dropdown-container" style="display: none;">
            <h2 class="fw-bold text-muted h6">Saved Configurations</h2>
            <select id="saved-projects-dropdown" class="form-select w-100 my-3"></select>

            <div class="d-flex gap-2 mb-2 w-100">
                <button id="btn-load-project" class="btn btn-outline-secondary w-100">
                    <i class="bi bi-cloud-download"></i> Load Project
                </button>
                <button id="btn-delete-project" class="btn btn-outline-danger w-100">
                    <i class="bi bi-trash"></i> Delete
                </button>
            </div>
        </div>

        <button id="btn-save-project" class="btn btn-success w-100 mt-2">
            <i class="bi bi-cloud-arrow-up"></i> Save Project
        </button>
        <a href="#" class="d-block text-muted mt-2 small text-end" id="terms">Terms and Conditions</a>
    </div>
</div>

<div class="modal fade" id="termsModal" tabindex="-1" aria-hidden="true" style="z-index: 1000000;">
    <div class="modal-dialog modal-dialog-centered modal-dialog-scrollable modal-lg">
        <div class="modal-content">
            <div class="modal-header bg-dark text-white">
                <h5 class="modal-title fw-bold"><i class="bi bi-file-earmark-text me-2"></i>Terms and Conditions</h5>
                <button type="button" class="btn-close btn-close-white" data-bs-dismiss="modal" aria-label="Close"></button>
            </div>
            <div class="modal-body text-dark" style="font-size: 14px; line-height: 1.6;">
                <h6 class="fw-bold mb-3">Estimating App Terms and Conditions</h6>
                <p>Westman Steel’s estimating app is provided for convenience only and is intended to assist dealers and contractors in preparing preliminary estimates and submitting order information. Westman Steel makes no representation or warranty, express or implied, as to the accuracy, completeness, or suitability of any estimate, calculation, measurement, quantity, color, size, delivery date, or other project information generated by or submitted through the app.</p>
                <p>It is the sole responsibility of the dealer and/or contractor to verify all measurements, quantities, specifications, colors, sizes, delivery requirements, and other project details before authorizing production. Westman Steel shall not be liable for any errors, omissions, or discrepancies arising from information entered into or transmitted through the app, whether caused by the dealer, contractor, or any third party.</p>
                <p>Following submission of an order, Westman Steel will issue an order confirmation. It is the responsibility of the dealer to ensure that Westman Steel has accurate and current contact information to receive such confirmations. The dealer must review the order confirmation promptly and acknowledge acceptance in writing by email, referencing both the Westman Steel sales order number and the dealer purchase order number.</p>
                <p>If Westman Steel does not receive written acknowledgment of the order confirmation prior to production, Westman Steel may proceed on the basis that the confirmed order details are correct. Any discrepancy, error, or omission not identified and confirmed in writing prior to production shall be the sole responsibility of the dealer and, where applicable, the dealer’s associated buying group. In such cases, the dealer and/or buying group shall be responsible for payment of the invoice in full.</p>
                <p><strong>Please note: The default panel length generated by the estimating app is 6 feet. This dimension must be confirmed with the plant prior to placing your final order.</strong></p>
                <div class="alert alert-primary mt-3 mb-0 text-center fw-bold">
                    Use of the estimating app constitutes acceptance of these terms and conditions.
                </div>
            </div>
            <div class="modal-footer">
                <button type="button" class="btn btn-outline-secondary" data-bs-dismiss="modal">I Understand</button>
            </div>
        </div>
    </div>
</div>

<div class="modal fade" id="panelModal" tabindex="-1" aria-hidden="true">
    <div class="modal-dialog modal-dialog-centered modal-lg">
        <div class="modal-content">
            <div class="modal-header">
                <h5 class="modal-title fw-bold" id="panelModalLabel">Panel 3D Viewer</h5>
                <button type="button" class="btn-close" data-bs-dismiss="modal" aria-label="Close"></button>
            </div>
            <div class="modal-body p-0" style="height: 500px; position: relative;">
                <div id="panel-canvas-container" style="width: 100%; height: 100%;"></div>
                <div id="panel-loading" class="position-absolute top-50 start-50 translate-middle" style="display: none;">
                    <div class="spinner-border text-primary" role="status"><span class="visually-hidden">Loading...</span></div>
                </div>
            </div>
        </div>
    </div>
</div>

<div class="modal fade" id="requestModal" tabindex="-1" aria-hidden="true">
    <div class="modal-dialog modal-lg modal-dialog-scrollable">
        <div class="modal-content">
            <div class="modal-header bg-dark text-white">
                <h5 class="modal-title fw-bold"><img src="<?php echo get_template_directory_uri(); ?>/assets/logotype-estimator-white.svg" style="width: 100px; margin-right: 1rem;" alt="Westman Steel"/>Request a Quote</h5>
                <button type="button" class="btn-close btn-close-white" data-bs-dismiss="modal" aria-label="Close"></button>
            </div>
            <div class="modal-body bg-white">
                <div class="row g-4">
                    <div class="col-12">
                        <div class="card shadow-sm border-0 mb-3">
                            <div class="card-body">
                                <h6 class="fw-bold text-primary mb-3">Your Information</h6>
                                <div class="row g-2 mb-2">
                                    <div class="col-6">
                                        <label class="small fw-bold">First Name</label>
                                        <input type="text" id="req-first-name" class="form-control form-control-sm" value="<?php echo esc_attr($first_name); ?>">
                                    </div>
                                    <div class="col-6">
                                        <label class="small fw-bold">Last Name</label>
                                        <input type="text" id="req-last-name" class="form-control form-control-sm" value="<?php echo esc_attr($last_name); ?>">
                                    </div>
                                </div>
                                <div class="row g-2 mb-3">
                                    <div class="col-6">
                                        <label class="small fw-bold">Email</label>
                                        <input type="email" id="req-email" class="form-control form-control-sm" value="<?php echo esc_attr($user_email); ?>">
                                    </div>
                                    <div class="col-6">
                                        <label class="small fw-bold">Phone</label>
                                        <input type="tel" id="req-phone" class="form-control form-control-sm" value="<?php echo esc_attr($user_phone); ?>">
                                    </div>
                                </div>
                                <?php 
                                $current_user_id = get_current_user_id(); 
                                $referral_email = get_user_meta($current_user_id, 'referral_email', true);
                                $access_code = get_user_meta($current_user_id, 'westman_access_code', true);

                                $office_codes = [
                                    'O@42@uL7xFikB$xVr)lc)I(u' => 'insidesalesbc@westmansteel.ca',
                                    '3o69JFNAoF265!^)9lJwDGxj' => 'orderdesksk@westmansteel.ca',
                                    'KOdnsv)i*ZwGIw5G)LZcqEoz' => 'OrderDeskAB@westmansteel.ca',
                                    'UAkHoWHtzwAzGUqTuQ#x@yeA' => 'OrderDeskMB@westmansteel.ca',
                                    '!pXKOgbyLnZ0^OD!IboEPPlg' => 'sales@scotiametal.ca',
                                ];

                                if (!in_array($referral_email, $office_codes, true)) {
                                    if (array_key_exists($access_code, $office_codes) && !empty($office_codes[$access_code])) {
                                        $referral_email = $office_codes[$access_code];
                                    }
                                }
                                ?>

                                <div class="row g-2 mb-3">
                                    <div class="col-4">
                                        <input type="hidden" class="form-control form-control-sm mb-3" id="req-recepient" value="<?php echo esc_attr($referral_email); ?>" disabled>
                                    </div>
                                    <div class="col-4">
                                        <input type="hidden" class="form-control form-control-sm mb-3" id="req-contact" value="<?php echo esc_attr($access_code); ?>" disabled>
                                    </div>
                                    <div class="col-4">
                                        <input type="hidden" class="form-control form-control-sm mb-3" id="pdf-file" value="" disabled>
                                    </div>
                                </div>
                                <label class="small fw-bold">Comments</label>
                                <textarea id="ui-project-comments" class="form-control form-control-sm mb-3" rows="3" placeholder="Additional Comments or Requests"></textarea>

                                <div class="row">
                                    <div class="col-12 mb-3">
                                        <input type="checkbox" class="form-check-input me-2" required/><strong>Disclaimer:</strong> <small>Westman Steel is not responsible for errors or omissions in estimates, measurements, quantities, colors, sizes, or delivery dates entered into the app. Dealers and contractors must verify all details  before production. An order confirmation will be sent, and it is the dealer’s responsibility to review it and reply by email with the Westman Steel sales order number and dealer purchase order number. If no written acknowledgment is received, production may proceed as confirmed. Any discrepancy not confirmed in writing before production is the responsibility of the dealer and/or buying group, who will be liable for the full invoice amount.</small>
                                    </div>
                                </div>
                                
                                <h6 class="fw-bold text-primary mb-2">Project Summary</h6>
                                <textarea id="req-project-summary" class="form-control form-control-sm text-muted" rows="6" readonly style="font-family: monospace; font-size: 11px; background-color:#f8f9fa;"></textarea>
                            </div>
                        </div>
                        <div class="text-center">
                            <button id="btn-submit-quote" class="btn btn-custom fw-bold py-2 shadow-sm d-inline-block">Submit to Westman Steel</button>
                        </div>
                    </div>
                </div>
            </div>
        </div>
    </div>
</div>

<!-- ПОДКЛЮЧЕНИЕ ВСЕХ JS-МОДУЛЕЙ МЕЖДУ СЕБОЙ -->
<script type="module" src="<?php echo esc_url(get_template_directory_uri() . '/app.js?v=' . filemtime(get_template_directory() . '/app.js')); ?>"></script>
<script type="module" src="<?php echo esc_url(get_template_directory_uri() . '/assets/script.js?v=' . filemtime(get_template_directory() . '/assets/script.js')); ?>"></script>

<?php } ?>

<?php if (!is_user_logged_in()) { ?>
    <script src="<?php echo get_template_directory_uri(); ?>/login.js?v=0.10.1"></script>
<?php } ?>

<script src="<?php echo get_template_directory_uri(); ?>/assets/bootstrap.bundle.min.js?v=0.10.1"></script>

<script>
(function() {
    const logEndpoint = '/wp-json/configurator/v1/log-system-status';

    function sendSystemLog(type, message, extra = {}) {
        const payload = {
            url: window.location.href,
            type: type,
            message: message,
            ...extra
        };

        if (navigator.sendBeacon) {
            navigator.sendBeacon(logEndpoint, JSON.stringify(payload));
        } else {
            fetch(logEndpoint, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify(payload)
            }).catch(() => {});
        }
    }

    window.addEventListener('error', function(event) {
        if (event.filename && event.filename.includes('extensions')) return;

        sendSystemLog('error', event.message, {
            stack: event.error ? event.error.stack : `Error in ${event.filename}:${event.lineno}:${event.colno}`
        });
    });

    window.addEventListener('unhandledrejection', function(event) {
        if (event.reason && event.reason.name === 'AbortError' &&
            event.reason.message === 'Transition was skipped') {
            event.preventDefault();
            return;
        }

        sendSystemLog('error', 'Unhandled Promise Rejection: ' + event.reason, {
            stack: event.reason && event.reason.stack ? event.reason.stack : null
        });
    });

    window.addEventListener('load', function() {
        let loadTimeText = 'Page loaded successfully.';
        if (window.performance && window.performance.timing) {
            const timing = window.performance.timing;
            const pageLoadTime = timing.loadEventEnd - timing.navigationStart;
            loadTimeText += ` Load time: ${pageLoadTime}ms`;
        }
        sendSystemLog('page_load', loadTimeText);
    });

    const originalConsoleError = console.error;
    console.error = function(...args) {
        originalConsoleError.apply(console, args);
        const message = args.map(arg => typeof arg === 'object' ? JSON.stringify(arg) : arg).join(' ');
        sendSystemLog('console_error', message);
    };
})(); 
</script>

<?php wp_footer(); ?>
</body>
</html>