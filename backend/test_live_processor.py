import asyncio
import logging

from live.live_processor import LiveProcessor


logging.basicConfig(
    level=logging.INFO
)


async def main():

    processor = LiveProcessor()

    print("Starting live webcam test...")
    print("Press CTRL+C to stop.")

    try:

        async for result in processor.process_stream(
            source=0,
            camera_id=1,
            detection_interval=5
        ):

            print(
                f"Frame: {result['frame_number']} | "
                f"People: {result['people_count']} | "
                f"Density: {result['density']:.3f} | "
                f"Risk: {result['risk_result']['risk_score']:.2f} | "
                f"Level: {result['risk_result']['risk_level']}"
            )

    except KeyboardInterrupt:

        print("Stopping webcam...")

        processor.stop()

    finally:

        processor.stop()


if __name__ == "__main__":
    asyncio.run(main())