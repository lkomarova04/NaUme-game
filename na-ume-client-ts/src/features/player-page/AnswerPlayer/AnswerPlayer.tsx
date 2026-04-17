import '../PlayerMainPage/PlayerMainPage.css'
type AnswerPlayerProps = {
    onStart: () => void;
}
const AnswerPlayer = ({onStart} : AnswerPlayerProps ) => {
    return (
        <div className="main-page">
            <div className="main-page__body">
                <div className="input-wrapper">
                    <img src="./check-square.png" className="input-icon" />
                    <input
                        className="main-page__input"
                        placeholder="Вариант ответа"
                    />
                </div>
                <button className="main-page__btn"
                onClick={onStart}
                >
                    Отправить 
                </button>
            </div>
        </div>
    )
}

export default AnswerPlayer;