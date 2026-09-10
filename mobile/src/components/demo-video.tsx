import { Platform, View } from 'react-native';
import { VideoView, useVideoPlayer } from 'expo-video';
import { WebView } from 'react-native-webview';
import { exerciseVideo } from '../../../lib/video';
import { API_ORIGIN, Body } from '../ui';

function FileVideo({ uri }: { uri: string }) {
  const player = useVideoPlayer(uri);
  return (
    <VideoView
      player={player}
      style={{ height: 190, borderRadius: 14 }}
      nativeControls
      contentFit="contain"
    />
  );
}
export function DemoVideo({ url, name }: { url: string; name: string }) {
  const source = exerciseVideo(url);
  if (!source)
    return <Body size={12}>This demonstration cannot be played.</Body>;
  const uri = source.src.startsWith('/') ? API_ORIGIN + source.src : source.src;
  return (
    <View style={{ gap: 8 }}>
      {source.kind === 'file' ? (
        <FileVideo uri={uri} />
      ) : (
        <View style={{ height: 200, overflow: 'hidden', borderRadius: 14 }}>
          {Platform.OS === 'web' ? (
            <iframe
              title={`${name} demonstration`}
              src={uri}
              style={{ width: '100%', height: '100%', border: 0 }}
              allow="fullscreen; picture-in-picture"
            />
          ) : (
            <WebView
              source={{ uri }}
              allowsInlineMediaPlayback
              javaScriptCanOpenWindowsAutomatically={false}
            />
          )}
        </View>
      )}
      <Body size={12}>{name} · Demonstration</Body>
    </View>
  );
}
