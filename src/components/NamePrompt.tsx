import { useEffect, useState } from 'react';
import {
  KeyboardAvoidingView,
  Modal,
  Platform,
  Pressable,
  StyleSheet,
  Text,
  TextInput,
  View,
} from 'react-native';

type NamePromptProps = {
  visible: boolean;
  initialName: string;
  isOnboarding: boolean;
  onSubmit: (name: string) => void;
  onClose: () => void;
};

const MAX_NAME_LENGTH = 16;

export function NamePrompt({
  visible,
  initialName,
  isOnboarding,
  onSubmit,
  onClose,
}: NamePromptProps) {
  const [draft, setDraft] = useState(initialName);

  useEffect(() => {
    if (visible) {
      setDraft(initialName);
    }
  }, [initialName, visible]);

  const handleSave = () => {
    onSubmit(draft);
    onClose();
  };

  return (
    <Modal
      visible={visible}
      animationType="fade"
      transparent
      onRequestClose={isOnboarding ? undefined : onClose}
    >
      <KeyboardAvoidingView
        style={styles.backdrop}
        behavior={Platform.OS === 'ios' ? 'padding' : undefined}
      >
        <View style={styles.card}>
          <Text style={styles.title}>{isOnboarding ? 'Meet your cat' : 'Rename your cat'}</Text>
          <Text style={styles.subtitle}>
            {isOnboarding ? 'What would you like to call them?' : 'Pick a new name.'}
          </Text>

          <TextInput
            style={styles.input}
            value={draft}
            onChangeText={setDraft}
            placeholder="Miso"
            placeholderTextColor="#b8a48f"
            maxLength={MAX_NAME_LENGTH}
            autoFocus
            returnKeyType="done"
            onSubmitEditing={handleSave}
            selectionColor="#c98a16"
          />

          <View style={styles.actions}>
            {!isOnboarding ? (
              <Pressable style={[styles.button, styles.secondary]} onPress={onClose}>
                <Text style={styles.secondaryText}>Cancel</Text>
              </Pressable>
            ) : null}
            <Pressable style={[styles.button, styles.primary]} onPress={handleSave}>
              <Text style={styles.primaryText}>{isOnboarding ? "Let's go" : 'Save'}</Text>
            </Pressable>
          </View>
        </View>
      </KeyboardAvoidingView>
    </Modal>
  );
}

const styles = StyleSheet.create({
  backdrop: {
    alignItems: 'center',
    backgroundColor: 'rgba(40, 28, 18, 0.5)',
    flex: 1,
    justifyContent: 'center',
    padding: 28,
  },
  card: {
    backgroundColor: '#fff8ee',
    borderRadius: 24,
    padding: 24,
    width: '100%',
  },
  title: {
    color: '#4a3528',
    fontSize: 22,
    fontWeight: '900',
  },
  subtitle: {
    color: '#7d604d',
    fontSize: 14,
    marginTop: 4,
  },
  input: {
    backgroundColor: '#fffdf8',
    borderColor: '#e7d6bf',
    borderRadius: 14,
    borderWidth: 2,
    color: '#4a3528',
    fontSize: 20,
    fontWeight: '700',
    marginTop: 18,
    paddingHorizontal: 16,
    paddingVertical: 12,
  },
  actions: {
    flexDirection: 'row',
    gap: 12,
    justifyContent: 'flex-end',
    marginTop: 20,
  },
  button: {
    borderRadius: 999,
    paddingHorizontal: 22,
    paddingVertical: 12,
  },
  primary: {
    backgroundColor: '#4a3528',
  },
  primaryText: {
    color: '#fff2df',
    fontSize: 16,
    fontWeight: '800',
  },
  secondary: {
    backgroundColor: '#f0e2cf',
  },
  secondaryText: {
    color: '#7d604d',
    fontSize: 16,
    fontWeight: '800',
  },
});
