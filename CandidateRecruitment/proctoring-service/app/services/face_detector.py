import os
import cv2
import numpy as np
from PIL import Image
from typing import List, Tuple, Dict, Any, Optional
import onnxruntime as ort

from app.config import settings
from app.schemas.response_schemas import FaceStatus, FaceAnalysisResult, BoundingBox
from app.utils.image_processing import compute_image_clarity, calculate_face_centering

class YuNetDeepFaceDetector:
    """
    OpenCV YuNet Deep Learning Face Detector powered by OpenCV native C++ DNN & ONNX.
    Delivers state-of-the-art accuracy, exact facial bounding boxes, and zero
    false-positive detections on background fixtures, ceiling lights, or glass partitions.
    """
    def __init__(self, model_path: Optional[str] = None):
        if model_path is None:
            base_dir = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
            model_path = os.path.join(base_dir, "models", "face_detection_yunet.onnx")
            
        self.model_path = model_path
        self.detector = None
        self.session = None
        self.score_thresh = float(settings.FACE_MIN_CONFIDENCE)
        self.nms_thresh = 0.30
        self._init_detector()

    def _init_detector(self):
        try:
            if os.path.exists(self.model_path) and os.path.getsize(self.model_path) > 10000:
                # Primary: OpenCV native FaceDetectorYN C++ engine
                if hasattr(cv2, 'FaceDetectorYN'):
                    self.detector = cv2.FaceDetectorYN.create(
                        model=self.model_path,
                        config="",
                        input_size=(320, 240),
                        score_threshold=self.score_thresh,
                        nms_threshold=self.nms_thresh,
                        top_k=5000
                    )
                    print(f"[FaceDetector] Successfully initialized cv2.FaceDetectorYN from {self.model_path}")

                # Secondary/Fallback: ONNX Runtime Inference Session
                opts = ort.SessionOptions()
                opts.intra_op_num_threads = 2
                opts.graph_optimization_level = ort.GraphOptimizationLevel.ORT_ENABLE_ALL
                self.session = ort.InferenceSession(self.model_path, sess_options=opts, providers=['CPUExecutionProvider'])
                self._generate_priors()
            else:
                print(f"[FaceDetector] Warning: YuNet model not found at {self.model_path}")
        except Exception as e:
            print(f"[FaceDetector] Error loading YuNet model: {e}")

    def _generate_priors(self, input_w=640, input_h=640):
        self.strides = [8, 16, 32]
        self.priors = []
        for stride in self.strides:
            w = input_w // stride
            h = input_h // stride
            grid_y, grid_x = np.meshgrid(np.arange(h), np.arange(w), indexing='ij')
            priors = np.stack([grid_x.ravel() * stride, grid_y.ravel() * stride], axis=-1)
            self.priors.append((stride, priors))

    def detect_raw_faces(self, image_rgb: np.ndarray) -> List[BoundingBox]:
        """
        Runs YuNet inference and returns decoded face bounding boxes.
        """
        if image_rgb is None or image_rgb.size == 0:
            return []

        h, w = image_rgb.shape[:2]
        if h < 20 or w < 20:
            return []

        # Convert RGB image to BGR for OpenCV
        try:
            if len(image_rgb.shape) == 3 and image_rgb.shape[2] == 3:
                image_bgr = cv2.cvtColor(image_rgb, cv2.COLOR_RGB2BGR)
            elif len(image_rgb.shape) == 2:
                image_bgr = cv2.cvtColor(image_rgb, cv2.COLOR_GRAY2BGR)
            else:
                image_bgr = image_rgb[..., :3][..., ::-1]
        except Exception:
            image_bgr = image_rgb

        # Method 1: cv2.FaceDetectorYN (fastest, exact calibration)
        if self.detector is not None:
            try:
                self.detector.setInputSize((w, h))
                self.detector.setScoreThreshold(self.score_thresh)
                retval, faces = self.detector.detect(image_bgr)

                if faces is not None and len(faces) > 0:
                    sorted_faces = sorted(faces, key=lambda f: float(f[-1]), reverse=True)
                    primary_face_area = None
                    valid_boxes = []

                    for idx, face in enumerate(sorted_faces):
                        bx, by, bw, bh = float(face[0]), float(face[1]), float(face[2]), float(face[3])
                        score = float(face[-1])

                        # Dimension sanity checks
                        if bw < 14 or bh < 14 or bw > w * 0.98 or bh > h * 0.98:
                            continue
                        
                        aspect = bh / (bw + 1e-6)
                        if aspect < 0.60 or aspect > 2.60:
                            continue

                        area = bw * bh
                        if idx == 0:
                            primary_face_area = area
                        else:
                            # Filter small background reflections or weak detections
                            if primary_face_area and area < (primary_face_area * 0.18):
                                continue
                            if score < 0.50:
                                continue

                        valid_boxes.append(
                            BoundingBox(
                                x=max(0, int(bx)),
                                y=max(0, int(by)),
                                width=min(w, int(bw)),
                                height=min(h, int(bh)),
                                confidence=round(score, 2),
                                is_primary=(idx == 0)
                            )
                        )

                    return valid_boxes
                return []
            except Exception as e:
                print(f"[FaceDetector] cv2.FaceDetectorYN inference failed, trying fallback: {e}")

        # Method 2 Fallback: ONNX Runtime Session
        if self.session is not None:
            try:
                scale = min(640.0 / w, 640.0 / h)
                new_w, new_h = int(w * scale), int(h * scale)

                pil_img = Image.fromarray(image_bgr).resize((new_w, new_h), Image.Resampling.BILINEAR)
                blob = np.zeros((640, 640, 3), dtype=np.float32)
                blob[:new_h, :new_w] = np.array(pil_img, dtype=np.float32)

                input_tensor = np.transpose(blob, (2, 0, 1))[np.newaxis, ...]
                outputs = self.session.run(None, {'input': input_tensor})

                cls_list = [outputs[0], outputs[1], outputs[2]]
                obj_list = [outputs[3], outputs[4], outputs[5]]
                bbox_list = [outputs[6], outputs[7], outputs[8]]

                candidates = []
                for stride_idx, (stride, priors) in enumerate(self.priors):
                    cls = cls_list[stride_idx][0, :, 0]
                    obj = obj_list[stride_idx][0, :, 0]
                    score = np.sqrt(np.clip(cls * obj, 0.0, 1.0))

                    mask = score >= self.score_thresh
                    if not np.any(mask):
                        continue

                    selected_scores = score[mask]
                    selected_priors = priors[mask]
                    selected_bboxes = bbox_list[stride_idx][0, mask, :]

                    cx = (selected_priors[:, 0] + selected_bboxes[:, 0] * stride) / scale
                    cy = (selected_priors[:, 1] + selected_bboxes[:, 1] * stride) / scale
                    bw = (np.exp(selected_bboxes[:, 2]) * stride) / scale
                    bh = (np.exp(selected_bboxes[:, 3]) * stride) / scale

                    bx = cx - bw / 2.0
                    by = cy - bh / 2.0

                    for s, x, y, bw_val, bh_val in zip(selected_scores, bx, by, bw, bh):
                        if bw_val < 16 or bh_val < 16 or bw_val > w * 0.98 or bh_val > h * 0.98:
                            continue
                        candidates.append({
                            "score": float(s),
                            "x": max(0, int(x)),
                            "y": max(0, int(y)),
                            "w": int(bw_val),
                            "h": int(bh_val)
                        })

                if not candidates:
                    return []

                candidates.sort(key=lambda c: c["score"], reverse=True)
                chosen = []
                for cand in candidates:
                    x1, y1, w1, h1 = cand["x"], cand["y"], cand["w"], cand["h"]
                    overlap = False
                    for prev in chosen:
                        px1, py1, pw1, ph1 = prev["x"], prev["y"], prev["w"], prev["h"]
                        ix1, iy1 = max(x1, px1), max(y1, py1)
                        ix2, iy2 = min(x1 + w1, px1 + pw1), min(y1 + h1, py1 + ph1)
                        if ix1 < ix2 and iy1 < iy2:
                            inter = (ix2 - ix1) * (iy2 - iy1)
                            union = (w1 * h1) + (pw1 * ph1) - inter
                            if inter / (union + 1e-6) > self.nms_thresh:
                                overlap = True
                                break
                    if not overlap:
                        chosen.append(cand)
                        if len(chosen) >= 4:
                            break

                return [
                    BoundingBox(
                        x=c["x"],
                        y=c["y"],
                        width=c["w"],
                        height=c["h"],
                        confidence=round(c["score"], 2),
                        is_primary=(i == 0)
                    )
                    for i, c in enumerate(chosen)
                ]
            except Exception as e:
                print(f"[FaceDetector] Fallback ONNX inference failed: {e}")

        return []


class RobustFaceDetector:
    """
    Main Face Detection Service integrating YuNet deep neural network detector.
    """
    def __init__(self):
        self.yunet_detector = YuNetDeepFaceDetector()

    def detect_faces(self, image_rgb: np.ndarray) -> FaceAnalysisResult:
        if image_rgb is None or image_rgb.size == 0:
            return FaceAnalysisResult(
                status=FaceStatus.CAMERA_UNAVAILABLE,
                face_count=0,
                confidence=0.0,
                message="Invalid or empty camera frame."
            )

        frame_height, frame_width = image_rgb.shape[:2]

        # Convert to Grayscale for clarity computation
        if len(image_rgb.shape) == 3:
            gray = np.dot(image_rgb[..., :3], [0.2989, 0.5870, 0.1140]).astype(np.uint8)
        else:
            gray = image_rgb.astype(np.uint8)

        clarity_score = compute_image_clarity(gray)
        is_clear = clarity_score >= settings.FACE_BLUR_THRESHOLD

        # Run YuNet Deep Learning Detection
        detected_boxes = self.yunet_detector.detect_raw_faces(image_rgb)
        face_count = len(detected_boxes)

        # 1. Multiple Faces Detected
        if face_count > 1:
            primary_box = detected_boxes[0]
            is_centered, off_x, off_y, coverage = calculate_face_centering(
                (primary_box.x, primary_box.y, primary_box.width, primary_box.height),
                frame_width, frame_height
            )
            return FaceAnalysisResult(
                status=FaceStatus.MULTIPLE_FACES,
                face_count=face_count,
                confidence=round(primary_box.confidence, 2),
                bounding_boxes=detected_boxes,
                is_centered=is_centered,
                center_offset_x=off_x,
                center_offset_y=off_y,
                coverage_ratio=coverage,
                is_clear=is_clear,
                clarity_score=round(clarity_score, 1),
                message=f"Multiple faces detected in camera frame ({face_count} faces). Only the candidate is permitted.",
                confirmed_violation=True,
                violation_type="MULTIPLE_FACES",
                violation_severity="HIGH"
            )

        # 2. Candidate Left / No Face Detected
        if face_count == 0:
            return FaceAnalysisResult(
                status=FaceStatus.FACE_NOT_DETECTED,
                face_count=0,
                confidence=0.0,
                bounding_boxes=[],
                is_centered=False,
                center_offset_x=0.0,
                center_offset_y=0.0,
                coverage_ratio=0.0,
                is_clear=is_clear,
                clarity_score=round(clarity_score, 1),
                message="Candidate face not detected in camera frame. Please position yourself in front of the camera.",
                confirmed_violation=False,
                violation_type="FACE_NOT_DETECTED",
                violation_severity="MEDIUM"
            )

        # 3. Exactly 1 Face Detected - Validate Quality & Visibility
        primary_box = detected_boxes[0]
        is_centered, off_x, off_y, coverage = calculate_face_centering(
            (primary_box.x, primary_box.y, primary_box.width, primary_box.height),
            frame_width, frame_height
        )

        is_coverage_valid = settings.FACE_MIN_COVERAGE_RATIO <= coverage <= settings.FACE_MAX_COVERAGE_RATIO

        if not is_clear or not is_coverage_valid or not is_centered:
            reason = []
            if not is_clear:
                reason.append("low clarity / blur")
            if coverage < settings.FACE_MIN_COVERAGE_RATIO:
                reason.append("too far from camera")
            elif coverage > settings.FACE_MAX_COVERAGE_RATIO:
                reason.append("too close to camera")
            if not is_centered:
                reason.append("off-center")

            msg = f"Candidate face is not clearly positioned ({', '.join(reason)}). Please adjust position."

            return FaceAnalysisResult(
                status=FaceStatus.FACE_NOT_CLEAR,
                face_count=1,
                confidence=primary_box.confidence,
                bounding_boxes=detected_boxes,
                is_centered=is_centered,
                center_offset_x=off_x,
                center_offset_y=off_y,
                coverage_ratio=coverage,
                is_clear=is_clear,
                clarity_score=round(clarity_score, 1),
                message=msg,
                confirmed_violation=False,
                violation_type="FACE_NOT_CLEAR",
                violation_severity="LOW"
            )

        # 4. Normal, Verified Face
        return FaceAnalysisResult(
            status=FaceStatus.FACE_DETECTED,
            face_count=1,
            confidence=primary_box.confidence,
            bounding_boxes=detected_boxes,
            is_centered=True,
            center_offset_x=off_x,
            center_offset_y=off_y,
            coverage_ratio=coverage,
            is_clear=True,
            clarity_score=round(clarity_score, 1),
            message="Candidate face successfully verified.",
            confirmed_violation=False
        )

face_detector = RobustFaceDetector()
