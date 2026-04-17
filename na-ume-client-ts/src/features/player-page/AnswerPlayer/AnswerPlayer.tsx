import '../PlayerMainPage/PlayerMainPage.css'
import check from './check-square.png'
type AnswerPlayerProps = {
  value: string;
  onChange: (value: string) => void;
  onStart: () => void;
}

const AnswerPlayer = ({ value, onChange, onStart }: AnswerPlayerProps) => {
  return (
    <div className="main-page">
      <div className="main-page__body">
        <div className="input-wrapper">
          <img src={check} className="input-icon" alt="answer" />
          <input
            className="main-page__input"
            placeholder="Вариант ответа"
            value={value}
            onChange={(event) => onChange(event.target.value)}
          />
        </div>
        <button className="main-page__btn" onClick={onStart}>
          Отправить
        </button>
      </div>
    </div>
  )
}

export default AnswerPlayer;
