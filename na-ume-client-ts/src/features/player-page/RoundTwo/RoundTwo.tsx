import { useTimer } from "@/shared/lib";
type RoundTwo = {
    phaseEndsAt: number | undefined;
}
const RoundTwo = ({phaseEndsAt} : RoundTwo) => {
    const timeLeft = useTimer(phaseEndsAt);
    return (
        <>
        <div className="round-header">
            <div className="question-timer">
          {timeLeft !== null ? timeLeft : ''}
        </div>
        </div>
        </>
    )
}

export default RoundTwo;