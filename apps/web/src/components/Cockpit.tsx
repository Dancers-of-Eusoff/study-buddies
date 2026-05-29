import { FilesetResolver, ObjectDetector } from "@mediapipe/tasks-vision"
import { useEffect, useRef, type RefObject } from "react";
import styles from "./Cockpit.module.css"

function Cockpit() {
    function LookAtMe() {
        const objectDetectorRef= useRef<ObjectDetector>(null);
        const videoRef = useRef<HTMLVideoElement>(null);

        useEffect(() => {
            const init = async () => {
                const vision = await FilesetResolver.forVisionTasks(
                    "https://cdn.jsdelivr.net/npm/@mediapipe/tasks-vision@0.10.35/wasm"
                );

                objectDetectorRef.current = await ObjectDetector.createFromOptions(vision, {
                    baseOptions: {
                        modelAssetPath: "/models/efficientdet_lite0.tflite"
                    },
                    scoreThreshold: 0.5,
                    runningMode: "VIDEO",
                    categoryAllowlist: ["cell phone"]
                })
            }

            const startCamera = async () => {
                const stream = await navigator.mediaDevices.getUserMedia({
                    video: true
                });

                if (videoRef.current) {
                    videoRef.current.srcObject = stream;
                    await videoRef.current.play();
                }
            };
            
            init();
            startCamera();
        }, []);

        return (
            <div className={styles.focusVideo}>
                <video ref={videoRef} autoPlay playsInline />
            </div>
        )
    }

    function User() {
        return (
            <div className={styles.focusVideo}>
                <img src="/social-page.gif" alt="user" style={{"height": "70%"}}/>
            </div>
        )
    }

    return (
        <div>
            <LookAtMe />
        </div>
    )
}

export default Cockpit