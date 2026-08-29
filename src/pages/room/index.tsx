import { serverSideTranslations } from 'next-i18next/serverSideTranslations';

import RoomView from '@/components/room/RoomView';
import { AppConfig } from '@/utils/AppConfig';

/**
 * Query-param twin of /room/[name]. A static export cannot pre-render an arbitrary
 * path param and has no server to resolve `fallback`, so the GitHub Pages build ships
 * this page instead and reads the room name from `?name=`. Legacy /room/<name> links
 * are redirected here by the generated 404.html.
 */
const Room = () => <RoomView />;

export async function getStaticProps({ locale }: { locale?: string }) {
  return {
    props: {
      ...(await serverSideTranslations(locale ?? AppConfig.defaultLocale)),
    },
  };
}

export default Room;
