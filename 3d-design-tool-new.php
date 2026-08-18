<?php
/**
 * Template Name: 3D Building Configurator [NEW]
 */

get_header(); ?>

<?php
$max_w_m   = (float) get_option('ubuild_max_width', 24.384);
$max_l_m   = (float) get_option('ubuild_max_length', 45.72);
$max_h_m   = (float) get_option('ubuild_max_height', 7.3152);
$max_oh_m  = (float) get_option('ubuild_max_overhang', 1.524);
$max_fh_m  = (float) get_option('ubuild_max_foundation_height', 0.6096);

$pitch_awr = (float) get_option('ubuild_pitch_awr', 0.05);
$pitch_ssr = (float) get_option('ubuild_pitch_ssr24', 0.04);

if (abs($pitch_ssr - 0.1666) < 0.005 || abs($pitch_ssr - 0.166) < 0.005) {
    $pitch_ssr = 2 / 12;
}
if (abs($pitch_awr - 0.1666) < 0.005 || abs($pitch_awr - 0.166) < 0.005) {
    $pitch_awr = 2 / 12;
}

$max_w_ft  = round($max_w_m * 3.28084, 1);
$max_l_ft  = round($max_l_m * 3.28084, 1);
$max_h_ft  = round($max_h_m * 3.28084, 1);
$max_oh_ft = round($max_oh_m * 3.28084, 1);

$pitch_awr_display = (round($pitch_awr * 12, 1)) . ':12';

$allow_vehicle        = (int) get_option('ubuild_allow_vehicle', 1);
$allow_forklift       = (int) get_option('ubuild_allow_forklift', 1);
$allow_airplane       = (int) get_option('ubuild_allow_airplane', 1);
$allow_truck          = (int) get_option('ubuild_allow_truck', 1);

$allow_interior_liner = (int) get_option('ubuild_allow_interior_liner', 1);
$allow_mezzanine      = (int) get_option('ubuild_allow_mezzanine', 1);
$allow_crane          = (int) get_option('ubuild_allow_crane', 1);
$allow_downspouts     = (int) get_option('ubuild_allow_downspouts', 1);

$all_colors = [];
if (have_rows('add_remove_color', 'option')) {
    while (have_rows('add_remove_color', 'option')) {
        the_row();
        $all_colors[] = [
            'color_name'     => get_sub_field('color_name'),
            'color_hexcode'  => get_sub_field('color_hexcode'),
            'color_category' => (array) get_sub_field('color_category'),
            'in_use'         => get_sub_field('in_use'),
        ];
    }
}

function get_colors_by_category_optimized($category, $all_colors)
{
    $filtered = [];
    foreach ($all_colors as $color) {
        if (in_array($category, $color['color_category'], true)) {
            $filtered[] = [
                'color_category' => $category,
                'color_name'     => $color['color_name'],
                'color_hexcode'  => $color['color_hexcode'],
                'in_use'         => $color['in_use'],
            ];
        }
    }
    return $filtered;
}

$roofColors      = get_colors_by_category_optimized('Roof', $all_colors);
$wallColors      = get_colors_by_category_optimized('Wall', $all_colors);
$trimColors      = get_colors_by_category_optimized('Trim', $all_colors);
$wainscotColors  = get_colors_by_category_optimized('Wainscot', $all_colors);
$mezzanineColors = get_colors_by_category_optimized('Mezzanine', $all_colors);
$ceilingColors   = get_colors_by_category_optimized('Ceiling', $all_colors);

$color_defaults = [];
if (have_rows('category_color_defaults', 'option')) {
    while (have_rows('category_color_defaults', 'option')) {
        the_row();
        $color_name = get_sub_field('color_name');
        $categories = (array) get_sub_field('category');
        foreach ($categories as $cat) {
            $color_defaults[$cat] = $color_name;
        }
    }
}

function get_color_defaults_optimized($color_categories, $color_defaults)
{
    foreach ($color_categories as $cat) {
        if (isset($color_defaults[$cat])) {
            return $color_defaults[$cat];
        }
    }
    return '';
}
?>

<div id="configurator-spinner" style="display: none; position: absolute; top: 50%; left: 50%; transform: translate(-50%, -50%); z-index: 10000; background: rgba(255,255,255,0.8); padding: 20px; border-radius: 8px; box-shadow: 0 4px 12px rgba(0,0,0,0.15); align-items: center; gap: 12px; font-family: sans-serif; font-weight: 500; color: #1e293b;">
    <div class="spinner-border text-primary" role="status" style="width: 2rem; height: 2rem;"></div>
    <span>Loading 3D Model...</span>
</div>

<div id="information">
<div class="alert alert-primary alert-dismissible fade show" role="alert">
	<svg xmlns="http://www.w3.org/2000/svg" class="bi flex-shrink-0 me-2" viewBox="0 0 16 16" role="img" aria-label="Warning:" style="width: 14px;">
	<path d="M8.982 1.566a1.13 1.13 0 0 0-1.96 0L.165 13.233c-.457.778.091 1.767.98 1.767h13.713c.889 0 1.438-.99.98-1.767L8.982 1.566zM8 5c.535 0 .954.462.9.995l-.35 3.507a.552.552 0 0 1-1.1 0L7.1 5.995A.905.905 0 0 1 8 5zm.002 6a1 1 0 1 1 0 2 1 1 0 0 1 0-2z"/>
	</svg>
	This is conseptual design tool. Our team will review your project and help finalize every detail.
	<button type="button" class="btn-close" data-bs-dismiss="alert" aria-label="Close" style="transform: transkateY(-10px); font-size: 12px;"></button>

</div>
</div>

<div id="app-container">
    <div id="canvas-container">
        <div id="top-tools">
            <button id="btnSaveDesign" class="btn btn-primary border-0 text-uppercase position-relative"><i class="bi bi-save d-inline-block me-2"></i> Save Design</button>
            <button id="btnGallery" class="btn btn-secondary border-0 text-uppercase position-relative"><i class="bi bi-images d-inline-block me-2"></i> Gallery</button>
            <button id="btnShare" class="btn btn-light border-0 text-uppercase position-relative"><i class="bi bi-link-45deg d-inline-block me-2"></i> Copy Link</button>
            <button id="btnHelp" class="btn btn-primary border-0 text-uppercase position-relative"><i class="bi bi-info-circle d-inline-block me-2"></i> Help</button>
        </div>
        
        <div id="viewer-controls-panel">
            <div class="form-check form-switch m-0 d-flex align-items-center">
                <input class="form-check-input me-2" type="checkbox" id="viewInsideToggle">
                <label class="form-check-label text-dark" style="font-weight: 300; font-size: 15px; position: relative; top: 3px;" for="viewInsideToggle">Inside View</label>
            </div>
            <button id="btnCompare" class="btn btn-sm btn-primary text-white fw-bold text-uppercase"><i class="bi bi-columns-gap me-1"></i> Compare</button>
            <button id="btnReset" class="btn btn-sm btn-secondary text-white fw-bold text-uppercase"><i class="bi bi-arrow-counterclockwise me-1"></i> Reset</button>
        </div>

        <div id="custom-help-popover" class="custom-popover-hidden">
            <div class="popover-header-custom">
                <span>Controls & Instructions</span>
                <button id="btnCloseHelp" class="btn-close btn-close-white btn-sm"></button>
            </div>
            <div class="popover-body-custom" style="font-size: 13px; line-height: 1.4;">
                <ul class="list-unstyled mb-2 p-0 text-white">
                    <li><i class="bi bi-mouse me-1"></i> <b>Left Click + Drag:</b> Look around / rotate camera</li>
                    <li><i class="bi bi-keyboard me-1"></i> <b>Hold Ctrl + Left Click:</b> Pan / move around scene</li>
                    <li><i class="bi bi-mouse2 me-1"></i> <b>Scroll Wheel:</b> Zoom in and out</li>
                </ul>
                <div class="popover-tip-text border-top pt-1 mt-1">
                    Tip: Click and drag placed windows/doors directly on the walls to relocate them. External reference models can also be dragged across the ground floor.
                </div>
            </div>
        </div>

        <div id="validation-warning"></div>
    </div>
    
    <div id="settings-panel" class="pt-3 px-3">
        <h5 class="mb-3">Building Configurator</h5>

        <button id="btn-trigger-quote-modal" class="btn btn-primary border-light text-uppercase position-relative animated-button mb-3 w-100" data-bs-toggle="modal" data-bs-target="#quoteModal">Request a free Quote</button>

        <!-- Small live summary directly under the Quote CTA -->
        <div class="card p-2 mb-3 border" id="sidebar-summary-card" style="background: #f8fafc; border-radius: 6px;">
            <div class="d-flex gap-2 align-items-center">
                <div id="sidebar-summary-image-container" style="width: 56px; height: 44px; flex-shrink: 0; background: #e2e8f0; border-radius: 4px; overflow: hidden; display: flex; align-items: center; justify-content: center;">
                    <img id="sidebar-summary-thumb" src="" alt="Building Snapshot" style="width: 100%; height: 100%; object-fit: cover; display: none;">
                    <i id="sidebar-summary-fallback" class="bi bi-building text-secondary" style="font-size: 18px;"></i>
                </div>
                <div style="font-size: 12px; line-height: 1.4;">
                    <div class="fw-bold text-dark" id="sidebar-summary-dimensions">60' x 100' x 16'</div>
                    <div class="text-muted" id="sidebar-summary-roof">Gable Roof</div>
                </div>
            </div>
        </div>

        <div class="form-check form-switch mb-3 pb-2 border-bottom">
            <input class="form-check-input" type="checkbox" id="unitToggle">
            <label class="form-check-label" id="unitToggleLabel">System: Imperial (ft)</label>
        </div>

        <div class="custom-accordion" id="configuratorAccordion">

            <!-- ================= 1. BUILDING ================= -->
            <div class="custom-accordion-item mb-2 active">
                <div class="custom-accordion-header bg-dark text-white fw-bold py-3 px-3 text-uppercase">
                    Building
                    <i class="bi bi-chevron-down float-end accordion-arrow"></i>
                </div>

                <div class="custom-accordion-content border p-3">
                    <div class="accordion-body px-1 py-3">

                        <div class="mb-3">
                            <label class="control-label">Roof Type <i class="bi bi-question-circle" data-bs-toggle="tooltip" title="Select between standard Gabled, Single Slope, or Side Sloped designs."></i></label>
                            <select class="form-select form-select-sm" id="roofType">
                                <option value="gabled">Gabled</option>
                                <option value="left-sloped">Left Sloped</option>
                                <option value="right-sloped">Right Sloped</option>
                            </select>
                        </div>

                        <div class="row g-2 mb-3">
                            <div class="col-6">
                                <label class="control-label">Roof Profile</label>
                                <select class="form-select form-select-sm" id="roofProfile">
                                    <option value="awr">AWR</option>
                                    <option value="SSR24">SSR24</option>
                                </select>
                            </div>
                            <div class="col-6">
                                <label class="control-label">Wall Profile</label>
                                <select class="form-select form-select-sm" id="wallProfile">
                                    <option value="awr">AWR</option>
                                    <option value="delta">DELTA SPAN</option>
                                    <option value="elite">ELITE RIB</option>
                                    <option value="imp">IMP (Smooth Panel)</option>
                                    <option value="ultra">ULTRA SPAN</option>
                                    <option value="widespan">WIDESPAN</option>
                                </select>
                            </div>
                        </div>

                        <div class="row g-2 align-items-center mb-2">
                            <div class="col-3"><label class="control-label mb-0" for="inputW">Width (W) <br><small class="text-muted">(Max: <span id="lblMaxW"><?php echo $max_w_ft; ?></span> <span class="unit-label">ft</span>)</small></label></div>
                            <div class="col-6"><input type="range" class="form-range dist-slider" id="inputW" min="20" max="<?php echo $max_w_ft; ?>" step="0.5" data-target="valW" data-m-min="6.10" data-m-max="<?php echo $max_w_m; ?>" data-m-step="0.1" data-current-m="18.28" value="60"></div>
                            <div class="col-3"><div class="input-group input-group-sm"><input type="number" class="form-control text-end" id="valW" value="60" step="1"><span class="input-group-text px-1 unit-label" style="font-size:11px;">ft</span></div></div>
                        </div>

                        <div class="row g-2 align-items-center mb-2">
                            <div class="col-3"><label class="control-label mb-0" for="inputL">Length (L) <br><small class="text-muted">(Max: <span id="lblMaxL"><?php echo $max_l_ft; ?></span> <span class="unit-label">ft</span>)</small></label></div>
                            <div class="col-6"><input type="range" class="form-range dist-slider" id="inputL" min="40" max="<?php echo $max_l_ft; ?>" step="0.5" data-target="valL" data-m-min="12.19" data-m-max="<?php echo $max_l_m; ?>" data-m-step="0.1" data-current-m="30.48" value="100"></div>
                            <div class="col-3"><div class="input-group input-group-sm"><input type="number" class="form-control text-end" id="valL" value="100" step="1"><span class="input-group-text px-1 unit-label" style="font-size:11px;">ft</span></div></div>
                        </div>

                        <div class="row g-2 align-items-center mb-2">
                            <div class="col-3"><label class="control-label mb-0" for="inputH">Height (H) <br><small class="text-muted">(Max: <span id="lblMaxH"><?php echo $max_h_ft; ?></span> <span class="unit-label">ft</span>)</small></label></div>
                            <div class="col-6"><input type="range" class="form-range dist-slider" id="inputH" min="10" max="<?php echo $max_h_ft; ?>" step="0.5" data-target="valH" data-m-min="3.05" data-m-max="<?php echo $max_h_m; ?>" data-m-step="0.1" data-current-m="4.88" value="16"></div>
                            <div class="col-3"><div class="input-group input-group-sm"><input type="number" class="form-control text-end" id="valH" value="16" step="1"><span class="input-group-text px-1 unit-label" style="font-size:11px;">ft</span></div></div>
                        </div>

                        <div class="row g-2 align-items-center mb-3">
                            <div class="col-3"><label class="control-label mb-0" for="inputPitch">Pitch <i class="bi bi-question-circle" data-bs-toggle="tooltip" title="The angle/slope of the roof."></i> <br><small class="text-muted">(Max: <span id="lblMaxPitch"><?php echo $pitch_awr_display; ?></span>)</small></label></div>
                            <div class="col-6"><input type="range" class="form-range" id="inputPitch" min="0" max="<?php echo $pitch_awr; ?>" step="0.001" data-m-min="0" data-m-max="<?php echo $pitch_awr; ?>" data-m-step="0.001" value="0.05"></div>
                            <div class="col-3"><input type="text" class="form-control form-control-sm text-end" id="valPitch" value="0.6:12"></div>
                        </div>

                    </div>
                </div>
            </div>

            <!-- ================= 2. COLORS ================= -->
            <div class="custom-accordion-item mb-2">
                <div class="custom-accordion-header bg-dark text-white fw-bold py-3 px-3 text-uppercase">
                    Colors
                    <i class="bi bi-chevron-down float-end accordion-arrow"></i>
                </div>

                <div class="custom-accordion-content border p-3">
                    <div class="accordion-body px-1 py-3">
                        <div class="col-12 mb-3"><label class="control-label">Roof Color</label>
                            <select class="form-select color-select" id="colorRoof">
                                <?php foreach ($roofColors as $color) {
                                    $roofDefaultColor = (trim(strtolower($color['color_name'])) === 'stone grey') ? 'selected' : ''; ?>
                                    <option value="<?php echo esc_attr($color['color_hexcode']); ?>" <?php echo $roofDefaultColor; ?>>
                                        <?php echo esc_html($color['color_name']); ?>
                                    </option>
                                <?php } ?>
                            </select>
                        </div>
                        <div class="col-12 mb-3"><label class="control-label">Wall Color</label>
                            <select class="form-select color-select" id="colorWall">
                                <?php foreach ($wallColors as $color) {
                                    $wallDefaultColor = (trim(strtolower($color['color_name'])) === 'white white') ? 'selected' : ''; ?>
                                    <option value="<?php echo esc_attr($color['color_hexcode']); ?>" <?php echo $wallDefaultColor; ?>>
                                        <?php echo esc_html($color['color_name']); ?>
                                    </option>
                                <?php } ?>
                            </select>
                        </div>
                        <div class="col-12 mb-3"><label class="control-label">Trim Color</label>
                            <select class="form-select color-select" id="colorTrim">
                                  <?php foreach ($trimColors as $color) {
                                        $trimDefaultColor = (trim(strtolower($color['color_name'])) === 'royal blue') ? 'selected' : ''; ?>
                                        <option value="<?php echo esc_attr($color['color_hexcode']); ?>" <?php echo $trimDefaultColor; ?>>
                                            <?php echo esc_html($color['color_name']); ?>
                                        </option>
                                    <?php } ?>
                            </select>
                        </div>
                        <div class="col-12 mb-3"><label class="control-label">Eave Trim Color</label>
                            <select class="form-select color-select" id="colorEaveTrim">
                                  <?php foreach ($trimColors as $color) {
                                        $eaveDefaultColor = (trim(strtolower($color['color_name'])) === 'royal blue') ? 'selected' : ''; ?>
                                        <option value="<?php echo esc_attr($color['color_hexcode']); ?>" <?php echo $eaveDefaultColor; ?>>
                                            <?php echo esc_html($color['color_name']); ?>
                                        </option>
                                    <?php } ?>
                            </select>
                        </div>
                        <div class="col-12 mb-3"><label class="control-label">Wainscot Color</label>
                            <select class="form-select color-select" id="colorWainscot">
                                 <?php foreach ($wainscotColors as $color) {
                                        $wainscotDefaultColor = (trim(strtolower($color['color_name'])) === 'royal blue') ? 'selected' : ''; ?>
                                        <option value="<?php echo esc_attr($color['color_hexcode']); ?>" <?php echo $wainscotDefaultColor; ?>>
                                            <?php echo esc_html($color['color_name']); ?>
                                        </option>
                                    <?php } ?>
                            </select>
                        </div>
                    </div>
                </div>
            </div>

            <!-- ================= 3. DOORS & WINDOWS ================= -->
            <div class="custom-accordion-item mb-2">
                <div class="custom-accordion-header bg-dark text-white fw-bold py-3 px-3 text-uppercase">
                    Doors &amp; Windows
                    <i class="bi bi-chevron-down float-end accordion-arrow"></i>
                </div>
                <div class="custom-accordion-content border p-3">
                    <div class="accordion-body px-1 py-3">
                        <p class="text-muted">Drag placed openings on the wall to move them.</p>
                        <div class="mb-2">
                            <select class="form-select form-select-sm mb-1" id="addOpeningWall"></select>
                            <select class="form-select form-select-sm mb-2" id="addOpeningType"></select>
                            <button class="btn btn-primary border-light text-uppercase position-relative animated-button mb-3 w-100 mt-2" id="btnAddOpening">Add Opening</button>
                        </div>
                        <div id="openingsList" class="mt-3"></div>
                    </div>
                </div>
            </div>

            <!-- ================= 4. BUILDING OPTIONS ================= -->
            <div class="custom-accordion-item mb-2">
                <div class="custom-accordion-header bg-dark text-white fw-bold py-3 px-3 text-uppercase">
                    Building Options
                    <i class="bi bi-chevron-down float-end accordion-arrow"></i>
                </div>
                <div class="custom-accordion-content border p-3">
                    <div class="accordion-body px-1 py-3">

                        <div class="form-check form-switch mb-2">
                            <input class="form-check-input" type="checkbox" id="wainscotEn" checked>
                            <label class="form-check-label">Enable Wainscot</label>
                        </div>
                        <div class="mb-3 ps-2" id="wsSettingsBlock">
                            <div class="row g-2 align-items-center">
                                <div class="col-3"><label class="control-label mb-0" for="inputWSHeight">Wainscot H</label></div>
                                <div class="col-6"><input type="range" class="form-range dist-slider" id="inputWSHeight" min="0.3" max="<?php echo $max_h_ft; ?>" step="0.5" data-target="valWS" data-m-min="0.3" data-m-max="<?php echo $max_h_m; ?>" data-m-step="0.1" data-current-m="1.2" value="3.9"></div>
                                <div class="col-3"><div class="input-group input-group-sm"><input type="number" class="form-control text-end" id="valWS" value="3.9" step="0.1"><span class="input-group-text px-1 unit-label" style="font-size:11px;">ft</span></div></div>
                            </div>
                        </div>

                        <div class="fw-bold text-secondary text-uppercase small mt-3 mb-2 pb-1 border-bottom">Roof Overhangs</div>
                        <div class="d-flex flex-column gap-2 mb-3">
                            <div class="row g-2 align-items-center">
                                <div class="col-3"><span class="control-label mb-0">Left (L):</span></div>
                                <div class="col-6"><input type="range" class="form-range dist-slider" id="overL" data-target="overL_val" min="0" max="<?php echo $max_oh_ft; ?>" step="0.1" data-m-min="0" data-m-max="<?php echo $max_oh_m; ?>" data-m-step="0.05" data-current-m="0" value="0"></div>
                                <div class="col-3"><div class="input-group input-group-sm"><input type="number" class="form-control text-end px-1" id="overL_val" value="0" step="0.1"><span class="input-group-text px-1 unit-label" style="font-size: 11px;">ft</span></div></div>
                            </div>
                            <div class="row g-2 align-items-center">
                                <div class="col-3"><span class="control-label mb-0">Right (R):</span></div>
                                <div class="col-6"><input type="range" class="form-range dist-slider" id="overR" data-target="overR_val" min="0" max="<?php echo $max_oh_ft; ?>" step="0.1" data-m-min="0" data-m-max="<?php echo $max_oh_m; ?>" data-m-step="0.05" data-current-m="0" value="0"></div>
                                <div class="col-3"><div class="input-group input-group-sm"><input type="number" class="form-control text-end px-1" id="overR_val" value="0" step="0.1"><span class="input-group-text px-1 unit-label" style="font-size: 11px;">ft</span></div></div>
                            </div>
                            <div class="row g-2 align-items-center">
                                <div class="col-3"><span class="control-label mb-0">Front (F):</span></div>
                                <div class="col-6"><input type="range" class="form-range dist-slider" id="overF" data-target="overF_val" min="0" max="<?php echo $max_oh_ft; ?>" step="0.1" data-m-min="0" data-m-max="<?php echo $max_oh_m; ?>" data-m-step="0.05" data-current-m="0" value="0"></div>
                                <div class="col-3"><div class="input-group input-group-sm"><input type="number" class="form-control text-end px-1" id="overF_val" value="0" step="0.1"><span class="input-group-text px-1 unit-label" style="font-size: 11px;">ft</span></div></div>
                            </div>
                            <div class="row g-2 align-items-center">
                                <div class="col-3"><span class="control-label mb-0">Back (B):</span></div>
                                <div class="col-6"><input type="range" class="form-range dist-slider" id="overB" data-target="overB_val" min="0" max="<?php echo $max_oh_ft; ?>" step="0.1" data-m-min="0" data-m-max="<?php echo $max_oh_m; ?>" data-m-step="0.05" data-current-m="0" value="0"></div>
                                <div class="col-3"><div class="input-group input-group-sm"><input type="number" class="form-control text-end px-1" id="overB_val" value="0" step="0.1"><span class="input-group-text px-1 unit-label" style="font-size: 11px;">ft</span></div></div>
                            </div>
                        </div>

                        <div class="fw-bold text-secondary text-uppercase small mt-3 mb-2 pb-1 border-bottom">Interior &amp; Structure</div>

                        <div class="form-check form-switch mt-2" style="<?php echo $allow_interior_liner ? '' : 'display:none;'; ?>">
                            <input class="form-check-input" type="checkbox" id="intWallsEn" <?php echo $allow_interior_liner ? '' : 'disabled'; ?>>
                            <label class="form-check-label">Interior Liner <small class="d-inline-block position-relative" style="font-size: 14px; top: -.5rem">(936 Cladding Profile)</small></label>
                        </div>
                        <div class="mb-3 ps-2 mt-1" id="intWallsSettings" style="display:none;">
                            <div class="row g-2 align-items-center">
                                <div class="col-3"><label class="control-label mb-0" for="intWallsH">Liner H (%)</label></div>
                                <div class="col-6"><input type="range" class="form-range" id="intWallsH" data-target="valIntWallsH" min="60" max="100" value="100"></div>
                                <div class="col-3"><div class="input-group input-group-sm"><input type="number" class="form-control text-end" id="valIntWallsH" value="100" step="1"><span class="input-group-text px-1">%</span></div></div>
                            </div>
                        </div>

                        <div class="form-check form-switch mt-2" style="<?php echo $allow_mezzanine ? '' : 'display:none;'; ?>">
                            <input class="form-check-input" type="checkbox" id="mezzEn" <?php echo $allow_mezzanine ? '' : 'disabled'; ?>>
                            <label class="form-check-label">Mezzanine Bays</label>
                        </div>

                        <div class="form-check form-switch mt-2" style="<?php echo $allow_crane ? '' : 'display:none;'; ?>">
                            <input class="form-check-input" type="checkbox" id="craneEn" <?php echo $allow_crane ? '' : 'disabled'; ?>>
                            <label class="form-check-label">Overhead Loading Crane</label>
                        </div>

<!-- Awnings/lean-tos: kept hidden exactly as before, only its container moved along with the rest of "Elements and Walls" -->
<div style="display: none;">
                        <label class="control-label mb-1">Show Awnings:</label>
                        <div class="toggles-grid mb-3">
                            <div class="form-check form-switch"><input class="form-check-input lt-active" type="checkbox" id="ltEnL" data-side="L"><label class="form-check-label">Left</label></div>
                            <div class="form-check form-switch"><input class="form-check-input lt-active" type="checkbox" id="ltEnR" data-side="R"><label class="form-check-label">Right</label></div>
                            <div class="form-check form-switch"><input class="form-check-input lt-active" type="checkbox" id="ltEnF" data-side="F"><label class="form-check-label">Front</label></div>
                            <div class="form-check form-switch"><input class="form-check-input lt-active" type="checkbox" id="ltEnB" data-side="B"><label class="form-check-label">Back</label></div>
                        </div>

                        <div class="awning-group">
                            <div id="ltSettingsL" style="display:none;" class="mini-input awning-settings-inner mb-3 border-start ps-2">
                                <span class="badge bg-secondary mb-2">Left Awning Config</span>
                                <div class="d-flex align-items-center mb-1 justify-content-between">
                                    <span class="awning-label-width">Drop Y:</span>
                                    <input type="range" class="form-range lt-val dist-slider w-50" data-target="ltDropL_val" data-side="L" data-prop="drop" id="ltDropL" data-m-min="0" data-m-max="15" data-m-step="0.1" data-current-m="0" value="0">
                                    <div class="value-input-group ms-2"><input type="number" class="value-input val-input-box" id="ltDropL_val" value="0" step="0.1"><span class="value-unit unit-label">ft</span></div>
                                </div>
                                <div class="d-flex align-items-center mb-1 justify-content-between">
                                    <span class="awning-label-width">Depth:</span>
                                    <input type="range" class="form-range lt-val dist-slider w-50" data-target="ltDepthL_val" data-side="L" data-prop="depth" id="ltDepthL" data-m-min="1" data-m-max="25" data-m-step="0.5" data-current-m="3" value="9.8">
                                    <div class="value-input-group ms-2"><input type="number" class="value-input val-input-box" id="ltDepthL_val" value="9.8" step="0.5"><span class="value-unit unit-label">ft</span></div>
                                </div>
                                <div class="d-flex align-items-center mb-1 justify-content-between">
                                    <span class="awning-label-width">Pitch:</span>
                                    <input type="range" class="form-range lt-val w-50" data-target="ltPitchL_val" data-side="L" data-prop="pitch" id="ltPitchL" min="1" max="4" step="0.1" value="1">
                                    <div class="value-input-group ms-2"><input type="number" class="value-input val-input-box" id="ltPitchL_val" value="1" step="0.1"></div>
                                </div>
                                <div class="d-flex align-items-center mb-1 justify-content-between">
                                    <span class="awning-label-width text-danger">Off L:</span>
                                    <input type="range" class="form-range lt-val dist-slider w-50" data-target="ltCutLL_val" data-side="L" data-prop="cutL" id="ltCutLL" data-m-min="0" data-m-max="50" data-m-step="0.5" data-current-m="0" value="0">
                                    <div class="value-input-group ms-2"><input type="number" class="value-input val-input-box text-danger" id="ltCutLL_val" value="0" step="0.5"><span class="value-unit unit-label">ft</span></div>
                                </div>
                                <div class="d-flex align-items-center mb-1 justify-content-between">
                                    <span class="awning-label-width text-danger">Off R:</span>
                                    <input type="range" class="form-range dist-slider w-50" data-target="ltCutRL_val" data-side="L" data-prop="cutR" id="ltCutRL" data-m-min="0" data-m-max="50" data-m-step="0.5" data-current-m="0" value="0">
                                    <div class="value-input-group ms-2"><input type="number" class="value-input val-input-box text-danger" id="ltCutRL_val" value="0" step="0.5"><span class="value-unit unit-label">ft</span></div>
                                </div>
                                <div class="d-flex gap-2 mt-2">
                                    <div class="form-check form-switch"><input class="form-check-input lt-wall-l" type="checkbox" data-side="L" id="ltWallLL"><label class="form-check-label">Left</label></div>
                                    <div class="form-check form-switch"><input class="form-check-input lt-wall-r" type="checkbox" data-side="L" id="ltWallRL"><label class="form-check-label">Right</label></div>
                                    <div class="form-check form-switch"><input class="form-check-input lt-wall-f" type="checkbox" data-side="L" id="ltWallFL"><label class="form-check-label">Front</label></div>
                                </div>
                            </div>

                            <div id="ltSettingsR" style="display:none;" class="mini-input awning-settings-inner mb-3 border-start ps-2">
                                <span class="badge bg-secondary mb-2">Right Awning Config</span>
                                <div class="d-flex align-items-center mb-1 justify-content-between">
                                    <span class="awning-label-width">Drop Y:</span>
                                    <input type="range" class="form-range lt-val dist-slider w-50" data-target="ltDropR_val" data-side="R" data-prop="drop" id="ltDropR" data-m-min="0" data-m-max="15" data-m-step="0.1" data-current-m="0" value="0">
                                    <div class="value-input-group ms-2"><input type="number" class="value-input val-input-box" id="ltDropR_val" value="0" step="0.1"><span class="value-unit unit-label">ft</span></div>
                                </div>
                                <div class="d-flex align-items-center mb-1 justify-content-between">
                                    <span class="awning-label-width">Depth:</span>
                                    <input type="range" class="form-range lt-val dist-slider w-50" data-target="ltDepthR_val" data-side="R" data-prop="depth" id="ltDepthR" data-m-min="1" data-m-max="25" data-m-step="0.5" data-current-m="3" value="9.8">
                                    <div class="value-input-group ms-2"><input type="number" class="value-input val-input-box" id="ltDepthR_val" value="9.8" step="0.5"><span class="value-unit unit-label">ft</span></div>
                                </div>
                                <div class="d-flex align-items-center mb-1 justify-content-between">
                                    <span class="awning-label-width">Pitch:</span>
                                    <input type="range" class="form-range lt-val w-50" data-target="ltPitchR_val" data-side="R" data-prop="pitch" id="ltPitchR" min="1" max="4" step="0.1" value="1">
                                    <div class="value-input-group ms-2"><input type="number" class="value-input val-input-box" id="ltPitchR_val" value="1" step="0.1"></div>
                                </div>
                                <div class="d-flex align-items-center mb-1 justify-content-between">
                                    <span class="awning-label-width text-danger">Off L:</span>
                                    <input type="range" class="form-range lt-val dist-slider w-50" data-target="ltCutLR_val" data-side="R" data-prop="cutL" id="ltCutLR" data-m-min="0" data-m-max="50" data-m-step="0.5" data-current-m="0" value="0">
                                    <div class="value-input-group ms-2"><input type="number" class="value-input val-input-box text-danger" id="ltCutLR_val" value="0" step="0.5"><span class="value-unit unit-label">ft</span></div>
                                </div>
                                <div class="d-flex align-items-center mb-1 justify-content-between">
                                    <span class="awning-label-width text-danger">Off R:</span>
                                    <input type="range" class="form-range dist-slider w-50" data-target="ltCutRB_val" data-side="R" data-prop="cutR" id="ltCutRB" data-m-min="0" data-m-max="50" data-m-step="0.5" data-current-m="0" value="0">
                                    <div class="value-input-group ms-2"><input type="number" class="value-input val-input-box text-danger" id="ltCutRB_val" value="0" step="0.5"><span class="value-unit unit-label">ft</span></div>
                                </div>
                                <div class="d-flex gap-2 mt-2">
                                    <div class="form-check form-switch"><input class="form-check-input lt-wall-l" type="checkbox" data-side="R" id="ltWallLR"><label class="form-check-label">Left</label></div>
                                    <div class="form-check form-switch"><input class="form-check-input lt-wall-r" type="checkbox" data-side="R" id="ltWallRR"><label class="form-check-label">Right</label></div>
                                    <div class="form-check form-switch"><input class="form-check-input lt-wall-f" type="checkbox" data-side="R" id="ltWallFR"><label class="form-check-label">Front</label></div>
                                </div>
                            </div>

                            <div id="ltSettingsF" style="display:none;" class="mini-input awning-settings-inner mb-3 border-start ps-2">
                                <span class="badge bg-secondary mb-2">Front Awning Config</span>
                                <div class="d-flex align-items-center mb-1 justify-content-between">
                                    <span class="awning-label-width">Drop Y:</span>
                                    <input type="range" class="form-range lt-val dist-slider w-50" data-target="ltDropF_val" data-side="F" data-prop="drop" id="ltDropF" data-m-min="0" data-m-max="15" data-m-step="0.1" data-current-m="0" value="0">
                                    <div class="value-input-group ms-2"><input type="number" class="value-input val-input-box" id="ltDropF_val" value="0" step="0.1"><span class="value-unit unit-label">ft</span></div>
                                </div>
                                <div class="d-flex align-items-center mb-1 justify-content-between">
                                    <span class="awning-label-width">Depth:</span>
                                    <input type="range" class="form-range lt-val dist-slider w-50" data-target="ltDepthF_val" data-side="F" data-prop="depth" id="ltDepthF" data-m-min="1" data-m-max="25" data-m-step="0.5" data-current-m="3" value="9.8">
                                    <div class="value-input-group ms-2"><input type="number" class="value-input val-input-box" id="ltDepthF_val" value="9.8" step="0.5"><span class="value-unit unit-label">ft</span></div>
                                </div>
                                <div class="d-flex align-items-center mb-1 justify-content-between">
                                    <span class="awning-label-width">Pitch:</span>
                                    <input type="range" class="form-range lt-val w-50" data-target="ltPitchF_val" data-side="F" data-prop="pitch" id="ltPitchF" min="1" max="4" step="0.1" value="1">
                                    <div class="value-input-group ms-2"><input type="number" class="value-input val-input-box" id="ltPitchF_val" value="1" step="0.1"></div>
                                </div>
                                <div class="d-flex align-items-center mb-1 justify-content-between">
                                    <span class="awning-label-width text-danger">Off L:</span>
                                    <input type="range" class="form-range lt-val dist-slider w-50" data-target="ltCutLF_val" data-side="F" data-prop="cutL" id="ltCutLF" data-m-min="0" data-m-max="50" data-m-step="0.5" data-current-m="0" value="0">
                                    <div class="value-input-group ms-2"><input type="number" class="value-input val-input-box text-danger" id="ltCutLF_val" value="0" step="0.5"><span class="value-unit unit-label">ft</span></div>
                                </div>
                                <div class="d-flex align-items-center mb-1 justify-content-between">
                                    <span class="awning-label-width text-danger">Off R:</span>
                                    <input type="range" class="form-range dist-slider w-50" data-target="ltCutRF_val" data-side="F" data-prop="cutR" id="ltCutRF" data-m-min="0" data-m-max="50" data-m-step="0.5" data-current-m="0" value="0">
                                    <div class="value-input-group ms-2"><input type="number" class="value-input val-input-box text-danger" id="ltCutRF_val" value="0" step="0.5"><span class="value-unit unit-label">ft</span></div>
                                </div>
                                <div class="d-flex gap-2 mt-2">
                                    <div class="form-check form-switch"><input class="form-check-input lt-wall-l" type="checkbox" data-side="F" id="ltWallLF"><label class="form-check-label">Left</label></div>
                                    <div class="form-check form-switch"><input class="form-check-input lt-wall-r" type="checkbox" data-side="F" id="ltWallRF"><label class="form-check-label">Right</label></div>
                                    <div class="form-check form-switch"><input class="form-check-input lt-wall-f" type="checkbox" data-side="F" id="ltWallFF"><label class="form-check-label">Front</label></div>
                                </div>
                            </div>

                            <div id="ltSettingsB" style="display:none;" class="mini-input awning-settings-inner mb-3 border-start ps-2">
                                <span class="badge bg-secondary mb-2">Back Awning Config</span>
                                <div class="d-flex align-items-center mb-1 justify-content-between">
                                    <span class="awning-label-width">Drop Y:</span>
                                    <input type="range" class="form-range lt-val dist-slider w-50" data-target="ltDropB_val" data-side="B" data-prop="drop" id="ltDropB" data-m-min="0" data-m-max="15" data-m-step="0.1" data-current-m="0" value="0">
                                    <div class="value-input-group ms-2"><input type="number" class="value-input val-input-box" id="ltDropB_val" value="0" step="0.1"><span class="value-unit unit-label">ft</span></div>
                                </div>
                                <div class="d-flex align-items-center mb-1 justify-content-between">
                                    <span class="awning-label-width">Depth:</span>
                                    <input type="range" class="form-range lt-val dist-slider w-50" data-target="ltDepthB_val" data-side="B" data-prop="depth" id="ltDepthB" data-m-min="1" data-m-max="25" data-m-step="0.5" data-current-m="3" value="9.8">
                                    <div class="value-input-group ms-2"><input type="number" class="value-input val-input-box" id="ltDepthB_val" value="9.8" step="0.5"><span class="value-unit unit-label">ft</span></div>
                                </div>
                                <div class="d-flex align-items-center mb-1 justify-content-between">
                                    <span class="awning-label-width">Pitch:</span>
                                    <input type="range" class="form-range lt-val w-50" data-target="ltPitchB_val" data-side="B" data-prop="pitch" id="ltPitchB" min="1" max="4" step="0.1" value="1">
                                    <div class="value-input-group ms-2"><input type="number" class="value-input val-input-box" id="ltPitchB_val" value="1" step="0.1"></div>
                                </div>
                                <div class="d-flex align-items-center mb-1 justify-content-between">
                                    <span class="awning-label-width text-danger">Off L:</span>
                                    <input type="range" class="form-range lt-val dist-slider w-50" data-target="ltCutLB_val" data-side="B" data-prop="cutL" id="ltCutLB" data-m-min="0" data-m-max="50" data-m-step="0.5" data-current-m="0" value="0">
                                    <div class="value-input-group ms-2"><input type="number" class="value-input val-input-box text-danger" id="ltCutLB_val" value="0" step="0.5"><span class="value-unit unit-label">ft</span></div>
                                </div>
                                <div class="d-flex align-items-center mb-1 justify-content-between">
                                    <span class="awning-label-width text-danger">Off R:</span>
                                    <input type="range" class="form-range dist-slider w-50" data-target="ltCutRB_val" data-side="B" data-prop="cutR" id="ltCutRB" data-m-min="0" data-m-max="50" data-m-step="0.5" data-current-m="0" value="0">
                                    <div class="value-input-group ms-2"><input type="number" class="value-input val-input-box text-danger" id="ltCutRB_val" value="0" step="0.5"><span class="value-unit unit-label">ft</span></div>
                                </div>
                                <div class="d-flex gap-2 mt-2">
                                    <div class="form-check form-switch"><input class="form-check-input lt-wall-l" type="checkbox" data-side="B" id="ltWallLB"><label class="form-check-label">Left</label></div>
                                    <div class="form-check form-switch"><input class="form-check-input lt-wall-r" type="checkbox" data-side="B" id="ltWallRB"><label class="form-check-label">Right</label></div>
                                    <div class="form-check form-switch"><input class="form-check-input lt-wall-f" type="checkbox" data-side="B" id="ltWallFB"><label class="form-check-label">Front</label></div>
                                </div>
                            </div>
                        </div>
</div>
<!-- end hidden awnings block -->

                        <div class="fw-bold text-secondary text-uppercase small mt-3 mb-2 pb-1 border-bottom">Drainage &amp; Site</div>

                        <div class="form-check form-switch mb-1">
                            <input class="form-check-input" type="checkbox" id="checkGutters">
                            <label class="form-check-label">Gutters &amp; Downspouts</label>
                        </div>

                        <div class="form-check form-switch mb-1"><input class="form-check-input" type="checkbox" id="drivewayEn"><label class="form-check-label">Show Driveway</label></div>

                    </div>
                </div>
            </div>

            <!-- ================= 5. VIEW ================= -->
            <div class="custom-accordion-item mb-2">
                <div class="custom-accordion-header bg-dark text-white fw-bold py-3 px-3 text-uppercase">
                    View
                    <i class="bi bi-chevron-down float-end accordion-arrow"></i>
                </div>
                <div class="custom-accordion-content border p-3">
                    <div class="accordion-body px-1 py-3">

                        <label class="control-label">Show Elements &amp; Walls:</label>
                        <div class="toggles-grid">
                            <div class="form-check form-switch"><input class="form-check-input" type="checkbox" id="wF" checked><label class="form-check-label">Front</label></div>
                            <div class="form-check form-switch"><input class="form-check-input" type="checkbox" id="wB" checked><label class="form-check-label">Back</label></div>
                            <div class="form-check form-switch"><input class="form-check-input" type="checkbox" id="wL" checked><label class="form-check-label">Left</label></div>
                            <div class="form-check form-switch"><input class="form-check-input" type="checkbox" id="wR" checked><label class="form-check-label">Right</label></div>
                            <div class="form-check form-switch"><input class="form-check-input" type="checkbox" id="checkRoof" checked><label class="form-check-label">Roof</label></div>
                            <div class="form-check form-switch"><input class="form-check-input" type="checkbox" id="checkLabels" checked><label class="form-check-label">Labels</label></div>
                        </div>

                        <hr class="my-2">
                        <label class="control-label">Framing Controls:</label>
                        <div class="toggles-grid">
                            <div class="form-check form-switch"><input class="form-check-input" type="checkbox" id="checkTrims" checked><label class="form-check-label">Show Trim</label></div>
                            <div class="form-check form-switch"><input class="form-check-input" type="checkbox" id="checkGirts" checked><label class="form-check-label">Show Girts</label></div>
                            <div class="form-check form-switch"><input class="form-check-input" type="checkbox" id="checkPurlins" checked><label class="form-check-label">Show Purlins</label></div>
                            <div class="form-check form-switch"><input class="form-check-input" type="checkbox" id="checkEWColumns" checked><label class="form-check-label">Show End Walls Columns</label></div>
                        </div>

                    </div>
                </div>
            </div>

            <!-- ================= 6. REFERENCE OBJECTS ================= -->
            <div class="custom-accordion-item mb-2">
                <div class="custom-accordion-header bg-dark text-white fw-bold py-3 px-3 text-uppercase">
                    Reference Objects
                    <i class="bi bi-chevron-down float-end accordion-arrow"></i>
                </div>
                <div class="custom-accordion-content border p-3">
                    <div class="accordion-body px-1 py-3">
                        <div class="p-2 border rounded-1 bg-light">
                            <div class="form-check mb-1" style="<?php echo $allow_vehicle ? '' : 'display:none;'; ?>">
                                <input class="form-check-input ref-model-checkbox" type="checkbox" value="ergoninane-fast-74.glb" id="refVehicle">
                                <label class="form-check-label" for="refVehicle" style="font-size:13px;">Vehicle</label>
                            </div>
                            <div class="form-check mb-1" style="<?php echo $allow_forklift ? '' : 'display:none;'; ?>">
                                <input class="form-check-input ref-model-checkbox" type="checkbox" value="forza1903-low-poly-2490.glb" id="refForklift">
                                <label class="form-check-label" for="refForklift" style="font-size:13px;">Forklift</label>
                            </div>
                            <div class="form-check mb-1" style="<?php echo $allow_airplane ? '' : 'display:none;'; ?>">
                                <input class="form-check-input ref-model-checkbox" type="checkbox" value="plane.glb" id="refAirplane">
                                <label class="form-check-label" for="refAirplane" style="font-size:13px;">Airplane</label>
                            </div>
                            <div class="form-check mb-0" style="<?php echo $allow_truck ? '' : 'display:none;'; ?>">
                                <input class="form-check-input ref-model-checkbox" type="checkbox" value="scania.glb" id="refTruck">
                                <label class="form-check-label" for="refTruck" style="font-size:13px;">Heavy Duty Truck</label>
                            </div>
                        </div>
                    </div>
                </div>
            </div>

        </div>
    </div>
</div>


<!-- ДВУХКОЛОНОЧНОЕ МОДАЛЬНОЕ ОКНО REQUEST A QUOTE -->
<div class="modal fade" id="quoteModal" tabindex="-1" aria-labelledby="quoteModalLabel" aria-hidden="true">
    <div class="modal-dialog modal-xl modal-dialog-centered">
        <div class="modal-content" style="border-radius: 8px; border: none; box-shadow: 0 10px 30px rgba(0,0,0,0.1);">
            <div class="modal-header border-0 pt-4 px-4 pb-0">
                <div>
                    <h4 class="modal-title fw-bold text-dark" id="quoteModalLabel" style="font-size: 24px;">Request a Quote</h4>
                    <p class="text-muted mb-0 mt-1" style="font-size: 14px;">Please provide a few details so our team can review your building and get back to you with a quote.</p>
                </div>
                <button type="button" class="btn-close" data-bs-dismiss="modal" aria-label="Close" style="font-size: 16px;"></button>
            </div>
            <div class="modal-body p-4">
                <div class="row g-4">
                    <!-- ЛЕВАЯ КОЛОНКА: ФОРМА GRAVITY FORMS -->
                    <div class="col-lg-8 border-end pe-lg-4" id="quoteModalBody">
                        <?php echo do_shortcode('[gravityform id="4" title="false" description="false" ajax="true"]'); ?>
                    </div>
                    
                    <!-- ПРАВАЯ КОЛОНКА: СИСТЕМНЫЙ САЙДБАР С ЗАГРУЗЧИКОМ И ПЕРЕНЕСЕННЫМ САБМИТОМ -->
                    <div class="col-lg-4 ps-lg-4" id="summary-sidebar">
                        <!-- Блок: Your Building Summary -->
                        <div class="card p-3 mb-3 border" style="background: #ffffff; border-radius: 6px;">
                            <h6 class="fw-bold text-dark mb-3" style="font-size: 14px; text-transform: uppercase; letter-spacing: 0.5px;">Your Building Summary</h6>
                            <div class="d-flex gap-3 align-items-start">
                                <div id="summary-image-container" style="width: 110px; height: 80px; background: #e2e8f0; border-radius: 4px; overflow: hidden; display: flex; align-items: center; justify-content: center;">
                                    <img id="summary-building-thumb" src="" alt="Building Snapshot" style="width: 100%; height: 100%; object-fit: cover; display: none;">
                                    <i id="summary-building-fallback" class="bi bi-building text-secondary" style="font-size: 28px;"></i>
                                </div>
                                <div style="font-size: 13px; line-height: 1.5;">
                                    <div class="text-muted">Building Type</div>
                                    <div class="fw-bold text-dark mb-2">Custom</div>
                                    <div class="text-muted">Size</div>
                                    <div class="fw-bold text-dark mb-1" id="summary-dimensions">60' x 100' x 16'</div>
                                    <div class="text-muted mt-2">Roof Style</div>
                                    <div class="fw-bold text-dark" id="summary-roof">Gable Roof</div>
                                </div>
                            </div>
                            <div class="mt-3 pt-3 border-top text-end">
                                <a href="#" data-bs-dismiss="modal" class="text-primary fw-bold text-decoration-none" style="font-size: 13px;"><i class="bi bi-pencil me-1"></i> View / Edit Your Design</a>
                            </div>
                        </div>

                        <!-- Блок: Drawings (If Available) -->
                        <div class="card p-3 mb-3 border text-center" id="custom-dropzone" style="background: #ffffff; border-radius: 6px; border-style: dashed !important; cursor: pointer; transition: background-color 0.2s;">
                            <h6 class="fw-bold text-dark text-start mb-2" style="font-size: 13px;">Drawings <span class="text-muted font-normal">(If Available)</span></h6>
                            <div class="py-3">
                                <i class="bi bi-cloud-arrow-up text-muted" style="font-size: 32px;"></i>
                                <div class="mt-2 text-dark" style="font-size: 13px; font-weight: 500;" id="dropzone-text">Drag & drop files here</div>
                                <div class="text-muted my-1" style="font-size: 12px;">or</div>
                                <button type="button" class="btn btn-sm btn-outline-secondary px-3" id="btn-custom-browse" style="font-size: 12px; border-radius: 4px;">Choose Files</button>
                                <div class="text-muted mt-2" style="font-size: 11px;">PDF, DWG, JPG, PNG (Max 25MB each)</div>
                                <div id="selected-file-name" class="mt-2 text-success fw-bold" style="font-size: 12px; display: none;"></div>
                            </div>
                        </div>

                        <!-- Блок: Notes -->
                        <div class="mb-3 p-2" style="font-size: 12px; color: #475569; display: flex; gap: 8px; align-items: start;">
                            <i class="bi bi-shield-check text-success" style="font-size: 16px; position: relative; top: -1px;"></i>
                            <span>Your information is secure and will only be used to provide your quote.</span>
                        </div>

                        <!-- Блок: What Happens Next? -->
                        <div class="card p-3 border-0 mb-3" style="background: #f8fafc; border-radius: 6px;">
                            <h6 class="fw-bold text-dark mb-3" style="font-size: 13px;">What Happens Next?</h6>
                            <ul class="list-unstyled m-0 p-0 d-flex flex-column gap-2" style="font-size: 12.5px; color: #334155;">
                                <li class="d-flex gap-2"><i class="bi bi-check-circle text-primary"></i> <span>Our team will review your design and details</span></li>
                                <li class="d-flex gap-2"><i class="bi bi-person text-primary"></i> <span>We may contact you for additional information</span></li>
                            </ul>
                        </div>

                        <!-- ПЕРЕНЕСЕННАЯ КНОПКА ОТПРАВКИ (SUBMIT) -->
                        <button type="button" id="custom-gform-submit" class="btn btn-primary w-100 py-2.5 text-uppercase fw-bold" style="background-color: #0d6efd; border: none; border-radius: 4px; font-size: 14px; letter-spacing: 0.5px;">Submit Request</button>
                    </div>
                </div>
            </div>
        </div>
    </div>
</div>


<!-- Modal / Popup for Editing Openings -->
<div id="openingPopup" style="display: none; position: absolute; z-index: 9999; width: 260px; background: #ffffff; border: 1px solid #cbd5e1; box-shadow: 0 10px 25px rgba(0,0,0,0.2); border-radius: 8px; padding: 15px; font-family: sans-serif;">
    <div style="display: flex; justify-content: space-between; align-items: center; margin-bottom: 12px; border-bottom: 1px solid #e2e8f0; padding-bottom: 8px;">
        <strong id="popupTitle" style="font-size: 14px; color: #0f172a;">Edit Opening</strong>
        <button type="button" id="btnPopupCancel" class="btn-close" style="font-size: 10px;"></button>
    </div>
    
    <div style="margin-bottom: 8px;">
        <label style="font-size: 12px; color: #475569; display: block; margin-bottom: 2px;">Width (<span class="popup-unit">m</span>)</label>
        <input type="number" id="popupOpWidth" class="form-control form-control-sm" step="0.1" min="0.5" max="20">
    </div>

    <div style="margin-bottom: 8px;">
        <label style="font-size: 12px; color: #475569; display: block; margin-bottom: 2px;">Height (<span class="popup-unit">m</span>)</label>
        <input type="number" id="popupOpHeight" class="form-control form-control-sm" step="0.1" min="0.5" max="20">
    </div>

    <div style="margin-bottom: 8px;">
        <label style="font-size: 12px; color: #475569; display: block; margin-bottom: 2px;">Offset X (<span class="popup-unit">m</span>)</label>
        <input type="number" id="popupOpOffset" class="form-control form-control-sm" step="0.1">
    </div>

    <div style="margin-bottom: 12px;" id="popupYOffContainer">
        <label style="font-size: 12px; color: #475569; display: block; margin-bottom: 2px;">Offset Y (Height from floor)</label>
        <input type="number" id="popupOpYOff" class="form-control form-control-sm" step="0.1" min="0">
    </div>

    <div style="display: flex; gap: 6px; justify-content: flex-end;">
        <button type="button" id="btnPopupDelete" class="btn btn-sm btn-outline-danger me-auto"><i class="bi bi-trash"></i></button>
        <button type="button" id="btnPopupUpdate" class="btn btn-sm btn-primary">Apply</button>
    </div>
</div>


<script type="importmap">
{
  "imports": {
    "three": "https://unpkg.com/three@0.136.0/build/three.module.js",
    "three/examples/jsm/controls/OrbitControls.js": "https://unpkg.com/three@0.136.0/examples/jsm/controls/OrbitControls.js",
    "three/examples/jsm/loaders/GLTFLoader.js": "https://unpkg.com/three@0.136.0/examples/jsm/loaders/GLTFLoader.js"
  }
}
</script>

<script>
window.ConfiguratorData = {
    themeUri: '<?php echo esc_url(get_stylesheet_directory_uri()); ?>'
};
</script>

<script src="https://cdn.jsdelivr.net/npm/bootstrap@5.3.0/dist/js/bootstrap.bundle.min.js"></script>
<script type="module" src="<?php echo get_stylesheet_directory_uri(); ?>/js/app-new.js"></script>
<script type="module" src="<?php echo get_stylesheet_directory_uri(); ?>/js/template-handler.js"></script>
<link rel="stylesheet" href="<?php echo get_stylesheet_directory_uri(); ?>/js/style.css" media="all" />
<link rel="stylesheet" href="<?php echo get_stylesheet_directory_uri(); ?>/js/template-style.css" media="all" />

<?php get_footer(); ?>