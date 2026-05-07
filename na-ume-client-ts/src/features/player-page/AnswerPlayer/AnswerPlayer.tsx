import '../PlayerMainPage/PlayerMainPage.css'
import check from './check-square.png'
type AnswerPlayerProps = {
  value: string;
  onChange: (value: string) => void;
  onStart: () => void;
  disabled?: boolean;
}

const AnswerPlayer = ({ value, onChange, onStart, disabled = false }: AnswerPlayerProps) => {
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
            disabled={disabled}
          />
        </div>
        <button
          className={`main-page__btn${disabled ? ' main-page__btn--disabled' : ''}`}
          onClick={onStart}
          disabled={disabled}
        >
          Отправить
        </button>
      </div>
    </div>
  )
}

export default AnswerPlayer;
