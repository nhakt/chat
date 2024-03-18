import React, { useState, useEffect, useRef } from 'react';
import firebase from 'firebase/compat/app';
import 'firebase/compat/firestore';
import "firebase/compat/auth";
import dayjs from 'dayjs';

import './ChatApp.css';

// Firebaseの設定
const firebaseConfig = {
    apiKey: "AIzaSyC9jV570qGmdwb6S0C4vM6gGotuUfCv3-k",
    authDomain: "chat-d56c3.firebaseapp.com",
    projectId: "chat-d56c3",
    storageBucket: "chat-d56c3.appspot.com",
    messagingSenderId: "248336956188",
    appId: "1:248336956188:web:681a8c8f490ceb803bd8d9"
};

// Firebaseアプリを初期化
const app = firebase.initializeApp(firebaseConfig);

// Firestoreのインスタンスを取得
const db = firebase.firestore(app);

const ChatApp = () => {
    const [user, setUser] = useState(null);
    const [message, setMessage] = useState('');
    const [messages, setMessages] = useState([]);
    const [username, setUsername] = useState('');
    const [password, setPassword] = useState('');
    const bottomRef = useRef(null);

    useEffect(() => {
        const unsubscribe = db.collection('messages').orderBy('timestamp').onSnapshot((snapshot) => {
            const newMessages = snapshot.docs.map((doc) => ({
                id: doc.id,
                ...doc.data(),
            }));
            setMessages(newMessages);
        });

        return unsubscribe;
    }, []);

    useEffect(() => {
        if (bottomRef.current) {
            bottomRef.current.scrollIntoView({ behavior: 'smooth' });
        }
    }, [messages]);

    const handleSubmit = async (e) => {
        e.preventDefault();

        if (password !== '10s5-3') {
            alert('パスワードが正しくありません');
            return;
        }

        try {
            await firebase.auth().signInAnonymously();
            setUser(firebase.auth().currentUser);
        } catch (error) {
            console.error('ログインエラー:', error);
        }
    };

    const sendMessage = async (e) => {
        e.preventDefault();

        if (!user) {
            alert('ログインしてください');
            return;
        }

        const { uid } = user;
        await db.collection('messages').add({
            text: message,
            username,
            uid,
            timestamp: firebase.firestore.FieldValue.serverTimestamp(),
        });

        setMessage('');
    };

    const MessageList = ({ messages }) => {
        return (
            <div>
                {messages.map((message) => (
                    <div key={message.id} class="container">
                        <div class="item"><span>{formatTimestamp(message.timestamp)}</span></div>
                        <div class="item"><strong>{message.username}:</strong> {message.text}</div>
                    </div>
                )).reverse()}
            </div>
        );
    };

    const formatTimestamp = (timestamp) => {
        if (timestamp != null) {
            const date = dayjs(timestamp.toDate());
            return date.format('YYYY-MM-DDTHH:mm');
        } else {
            return '';
        }
    };

    return (
        <div>
            {!user ? (
                <div>
                    <h1>ログイン</h1>
                    <form onSubmit={handleSubmit}>
                        <input
                            type="text"
                            placeholder="ユーザ名"
                            value={username}
                            onChange={(e) => setUsername(e.target.value)}
                        />
                        <input
                            type="password"
                            placeholder="パスワード"
                            value={password}
                            onChange={(e) => setPassword(e.target.value)}
                        />
                        <button type="submit">ログイン</button>
                    </form>
                </div>
            ) : (
                <div>
                    <h1>チャット</h1>
                    <form onSubmit={sendMessage}>
                        <input
                            type="text"
                            placeholder="メッセージを入力"
                            value={message}
                            onChange={(e) => setMessage(e.target.value)}
                        />
                        <button type="submit">送信</button>
                    </form>
                    <div>
                        <MessageList messages={messages} />
                        <div ref={bottomRef} />
                    </div>
                </div>
            )}
        </div>
    );
};

export default ChatApp;