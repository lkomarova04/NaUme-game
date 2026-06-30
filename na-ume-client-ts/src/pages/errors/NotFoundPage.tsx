import { Link } from 'react-router-dom';

import { StateScreen } from '@/shared/ui/StateScreen/StateScreen';

const NotFoundPage = () => {
  return (
    <StateScreen
      eyebrow="404"
      title="Страница не найдена"
      description="Адрес оказался пустым. Возможно, ссылка устарела или была набрана с ошибкой."
      detail="Проверьте путь и попробуйте еще раз."
      actions={<Link to="/">Вернуться в игру</Link>}
    />
  );
};

export default NotFoundPage;
