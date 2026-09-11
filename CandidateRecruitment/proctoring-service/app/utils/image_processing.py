import base64
import io
import numpy as np
from PIL import Image
from typing import Optional, Tuple

def decode_base64_image(image_base64: str) -> Optional[np.ndarray]:
    """
    Decodes a base64 encoded image string (with or without data URI prefix)
    into a numpy RGB array (Height, Width, 3).
    """
    try:
        if "," in image_base64:
            # Remove data:image/jpeg;base64, prefix
            image_base64 = image_base64.split(",", 1)[1]
            
        img_bytes = base64.b64decode(image_base64)
        pil_image = Image.open(io.BytesIO(img_bytes)).convert("RGB")
        img_np = np.array(pil_image)
        return img_np
    except Exception as e:
        return None

def compute_image_clarity(gray_img: np.ndarray) -> float:
    """
    Calculates image sharpness/blur score using variance of Laplacian.
    Higher values = sharp/focused; lower values (< 40) = blurred/out of focus.
    """
    try:
        # Standard Laplacian kernel approximation
        kernel = np.array([[0, 1, 0], [1, -4, 1], [0, 1, 0]], dtype=np.float32)
        
        # Fast 2D convolution for blur estimation
        h, w = gray_img.shape
        if h < 20 or w < 20:
            return 100.0
            
        # Sample patch to keep computation instant (<1ms)
        step_y = max(1, h // 120)
        step_x = max(1, w // 160)
        sampled = gray_img[::step_y, ::step_x].astype(np.float32)
        
        # Convolve with Laplacian
        pad_img = np.pad(sampled, 1, mode='edge')
        laplacian = (
            pad_img[:-2, 1:-1] +
            pad_img[2:, 1:-1] +
            pad_img[1:-1, :-2] +
            pad_img[1:-1, 2:] -
            4 * pad_img[1:-1, 1:-1]
        )
        variance = float(np.var(laplacian))
        return variance
    except Exception:
        return 100.0

def calculate_face_centering(
    bbox: Tuple[int, int, int, int],
    frame_width: int,
    frame_height: int
) -> Tuple[bool, float, float, float]:
    """
    Calculates face center offset relative to the frame center and frame coverage ratio.
    Returns: (is_centered, offset_x, offset_y, coverage_ratio)
    """
    x, y, w, h = bbox
    face_center_x = x + w / 2.0
    face_center_y = y + h / 2.0
    
    frame_center_x = frame_width / 2.0
    frame_center_y = frame_height / 2.0
    
    # Normalized offset [-1.0 to 1.0]
    offset_x = (face_center_x - frame_center_x) / frame_center_x if frame_center_x > 0 else 0.0
    offset_y = (face_center_y - frame_center_y) / frame_center_y if frame_center_y > 0 else 0.0
    
    face_area = float(w * h)
    frame_area = float(frame_width * frame_height) if frame_width > 0 and frame_height > 0 else 1.0
    coverage_ratio = face_area / frame_area
    
    # Tolerable centering: within 60% X and 65% Y from center
    is_centered = abs(offset_x) <= 0.60 and abs(offset_y) <= 0.65
    
    return is_centered, round(offset_x, 3), round(offset_y, 3), round(coverage_ratio, 4)
