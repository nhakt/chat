import React, { useState, useEffect, useRef } from 'react';
import firebase from 'firebase/compat/app';
import 'firebase/compat/firestore';
import "firebase/compat/auth";
import 'firebase/compat/storage';
import dayjs from 'dayjs';
import notificationSound from './notification.mp3';
import { FaBell } from "react-icons/fa"
import { FaBellSlash } from "react-icons/fa"

import './ChatApp.css';

//audio
const audio = new Audio(notificationSound);
let isLogin = false;

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

//strage
const storage = firebase.storage();

const ChatApp = () => {
    const [user, setUser] = useState(null);
    const [message, setMessage] = useState('');
    const [messages, setMessages] = useState([]);
    const [username, setUsername] = useState('');
    const [password, setPassword] = useState('');
    const bottomRef = useRef(null);

    //notify
    const [isNotificationEnabled, setIsNotificationEnabled] = useState(true);
    const toggleNotification = () => {
        setIsNotificationEnabled((prev) => !prev);
    };

    useEffect(() => {
        const unsubscribe = db.collection('messages').orderBy('timestamp').onSnapshot((snapshot) => {
            const newMessages = snapshot.docs.map((doc) => ({
                id: doc.id,
                message: doc.message,
                ...doc.data(),
            }));
            setMessages(newMessages);

            //play sound
            const isNotOwnMessage = newMessages[newMessages.length - 1]?.uid !== user?.uid;
            if (isLogin && isNotOwnMessage && isNotificationEnabled) {
                play(audio);
            }
        });

        return unsubscribe;
    }, [user, isNotificationEnabled]);

    function play(audio) {
        audio.play();
    }

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
            isLogin = true;
        } catch (error) {
            console.error('ログインエラー:', error);
        }
    };

    //strage
    const [image, setImage] = useState(null);
    const handleImageUpload = (e) => {
        const file = e.target.files[0];
        setImage(file);
    };

    const sendMessage = async (e) => {
        e.preventDefault();

        if (!user) {
            alert('ログインしてください');
            return;
        }

        const { uid } = user;

        if (image) {
            // 画像をアップロードする
            const uploadTask = storage.ref(`images/${image.name}`).put(image);
            uploadTask.on(
                'state_changed',
                (snapshot) => {
                    // アップロード進捗状況の取得
                },
                (error) => {
                    console.error('画像のアップロードに失敗しました', error);
                },
                async () => {
                    const downloadURL = await uploadTask.snapshot.ref.getDownloadURL();
                    await db.collection('messages').add({
                        imageURL: downloadURL,
                        username,
                        uid,
                        timestamp: firebase.firestore.FieldValue.serverTimestamp(),
                    });
                }
            );
            setImage(null);
        } else {
            if (message === '')
                return;

            //send message
            await db.collection('messages').add({
                text: message,
                username,
                uid,
                timestamp: firebase.firestore.FieldValue.serverTimestamp(),
            });
        }

        setMessage('');
    };

    //image
    const handlePaste = (e) => {
        console.log("call handlePaste")
        const clipboardData = e.clipboardData || window.clipboardData;
        const items = clipboardData.items;

        console.log("clipboardData: " + clipboardData)
        console.log("items: " + items)

        for (let i = 0; i < items.length; i++) {
            const item = items[i];
            if (item.type.indexOf('image') !== -1) {
                const file = item.getAsFile();
                setImage(file);
                break;
            }
        }
    };

    const [showImageModal, setShowImageModal] = useState(false);
    const [modalImageURL, setModalImageURL] = useState('');

    const handleImageClick = (imageURL) => {
        setModalImageURL(imageURL);
        setShowImageModal(true);
    };

    const MessageList = ({ messages }) => {
        return (
            <div>
                {messages.map((message) => (
                    <div key={message.id} className="message-container">
                        <div className="message-header">
                            <strong className="username">{message.username}:</strong>
                            {message.imageURL ? (
                                <img
                                    src={message.imageURL}
                                    alt="Uploaded"
                                    className="message-image-thumbnail"
                                    onClick={() => handleImageClick(message.imageURL)}
                                />
                            ) : (
                                <div className="message-text">{message.text}</div>
                            )}
                        </div>
                        <span className="timestamp">{formatTimestamp(message.timestamp)}</span>
                    </div>
                )).reverse()}
            </div>
        );
    };

    const formatTimestamp = (timestamp) => {
        if (timestamp != null) {
            const date = dayjs(timestamp.toDate());
            return date.format('YYYY-MM-DD HH:mm');
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
                            className="input-field"
                            type="text"
                            placeholder="メッセージを入力"
                            value={message}
                            onChange={(e) => setMessage(e.target.value)}
                            onPaste={handlePaste}
                        />
                        <button className="button-field" type="submit">送信</button>
                        <button className="button-field" type="button" onClick={toggleNotification}>
                            {isNotificationEnabled ? (<FaBell />) : (<FaBellSlash />)}
                        </button>
                        <br />
                        {image && <p>image set</p>}
                        <br />
                        <input
                            type="file"
                            accept="image/*"
                            onChange={handleImageUpload}
                        />
                    </form>
                    <div>
                        <MessageList messages={messages} />
                        <div ref={bottomRef} />
                    </div>
                    {showImageModal && (
                        <div className="image-modal">
                            <div className="image-modal-content">
                                <span className="close" onClick={() => setShowImageModal(false)}>
                                    &times;
                                </span>
                                <img src={modalImageURL} alt="Uploaded" />
                            </div>
                        </div>
                    )}
                </div>
            )}
        </div>
    );
};

export default ChatApp;