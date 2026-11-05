import numpy as np

def normalize_lab(lab):
    """Normalize LAB values to comparable ranges"""
    L, a, b = lab
    return np.array([L / 255.0, (a - 128) / 128.0, (b - 128) / 128.0])

def chroma(a, b):
    """Color intensity (saturation proxy)"""
    return np.sqrt(a**2 + b**2)

def cosine_similarity(v1, v2):
    """Directional similarity (better than Euclidean for color harmony)"""
    denom = (np.linalg.norm(v1) * np.linalg.norm(v2)) + 1e-8
    return np.dot(v1, v2) / denom

def calculate_suitability_score(clothing_lab, skin_lab, hair_lab):
    """
    Returns a score from 0–100 based on:
    - Undertone match
    - Contrast harmony
    - Hue compatibility
    - Chroma (vibrancy)
    - Washout avoidance
    """
    c = normalize_lab(clothing_lab)
    s = normalize_lab(skin_lab)
    h = normalize_lab(hair_lab)

    c_L, c_a, c_b = c
    s_L, s_a, s_b = s
    h_L, h_a, h_b = h

    is_warm = s_b > 0
    contrast = abs(h_L - s_L)

    undertone_score = 0
    if is_warm and c_b > 0:
        undertone_score = 25
    elif not is_warm and c_b < 0:
        undertone_score = 25
    else:
        undertone_score = 10

    c_hue_vec = np.array([c_a, c_b])
    s_hue_vec = np.array([s_a, s_b])

    hue_sim = cosine_similarity(c_hue_vec, s_hue_vec)
    hue_score = (hue_sim + 1) / 2 * 20

    lightness_diff = abs(c_L - s_L)

    if contrast > 0.4:
        contrast_score = min(20, lightness_diff * 50)
    else:
        if 0.15 < lightness_diff < 0.4:
            contrast_score = 20
        else:
            contrast_score = 10

    c_chroma = chroma(c_a, c_b)
    s_chroma = chroma(s_a, s_b)

    chroma_diff = abs(c_chroma - s_chroma)

    chroma_score = max(0, 15 - chroma_diff * 20)

    washout_penalty = 0
    if lightness_diff < 0.15:
        washout_penalty = (0.15 - lightness_diff) * 200

    score = (
        undertone_score +
        hue_score +
        contrast_score +
        chroma_score -
        washout_penalty
    )

    return round(float(np.clip(score, 0, 100)), 2)

def rank_clothes(inventory, skin_lab, hair_lab):
    if not inventory:
        return {}
    ids = list(inventory)
    c = np.asarray(list(inventory.values()), dtype=np.float64)
    c = (c - [0, 128, 128]) / [255, 128, 128]
    s, h = normalize_lab(skin_lab), normalize_lab(hair_lab)
    light = np.abs(c[:, 0] - s[0])
    warm = (c[:, 2] > 0) if s[2] > 0 else (c[:, 2] < 0)
    hue = (c[:, 1:] @ s[1:]) / (np.linalg.norm(c[:, 1:], axis=1) * np.linalg.norm(s[1:]) + 1e-8)
    contrast = np.minimum(20, light * 50) if abs(h[0] - s[0]) > .4 else np.where((light > .15) & (light < .4), 20, 10)
    scores = np.where(warm, 25, 10) + (hue + 1) * 10 + contrast
    scores += np.maximum(0, 15 - np.abs(np.linalg.norm(c[:, 1:], axis=1) - np.linalg.norm(s[1:])) * 20)
    scores -= np.where(light < .15, (.15 - light) * 200, 0)
    return dict(zip(ids, [round(float(v), 2) for v in np.clip(scores, 0, 100)]))
