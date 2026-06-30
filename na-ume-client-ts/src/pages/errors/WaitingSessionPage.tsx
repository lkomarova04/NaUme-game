import { StateScreen } from '@/shared/ui/StateScreen/StateScreen';

type WaitingSessionPageProps = {
  title?: string;
  description?: string;
  detail?: string;
};

const WaitingSessionPage = ({
  title = 'Ждем игровую сессию',
  description = 'Экран уже готов, но игра еще не стартовала. Как только организатор создаст или запустит сессию, все обновится автоматически.',
  detail = 'Если вы видите этот экран на display, проверьте, что сессия создана и соединение с сервером активно.',
}: WaitingSessionPageProps) => {
  return <StateScreen eyebrow="Ожидание" title={title} description={description} detail={detail} />;
};

export default WaitingSessionPage;
