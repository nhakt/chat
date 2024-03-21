import React, { useState, useEffect } from 'react';
import firebase from 'firebase/compat/app';
import 'firebase/compat/firestore';
import "firebase/compat/auth";
import 'firebase/compat/storage';
import dayjs from 'dayjs';
import notificationSound from './notification.mp3';
import { FaBell } from "react-icons/fa"
import { FaBellSlash } from "react-icons/fa"
import Linkify from 'react-linkify';

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

const PAGE_SIZE = 50;

const ChatApp = () => {
    const [user, setUser] = useState(null);
    const [message, setMessage] = useState('');
    const [messages, setMessages] = useState([]);
    const [username, setUsername] = useState('');
    const [password, setPassword] = useState('');

    //notify
    const [isNotificationEnabled, setIsNotificationEnabled] = useState(true);
    const toggleNotification = () => {
        setIsNotificationEnabled((prev) => !prev);
    };

    //pagenate
    const [currentPage, setCurrentPage] = useState(0);
    const [totalPages, setTotalPages] = useState(0);

    useEffect(() => {
        const unsubscribe = db.collection('messages').orderBy('timestamp', 'desc').onSnapshot((snapshot) => {
            const allMessages = snapshot.docs.map((doc) => ({
                id: doc.id,
                ...doc.data(),
            }));

            const totalMessages = allMessages.length;
            const totalPages = Math.ceil(totalMessages / PAGE_SIZE);
            setTotalPages(totalPages);

            const startIndex = currentPage * PAGE_SIZE;
            const endIndex = startIndex + PAGE_SIZE;
            const newMessages = allMessages.slice(startIndex, endIndex);

            setMessages(newMessages);
        });

        return unsubscribe;
    }, [currentPage]);

    const handleNextPage = () => {
        setCurrentPage((prevPage) => prevPage + 1);
    };

    const handlePrevPage = () => {
        setCurrentPage((prevPage) => prevPage - 1);
    };


    useEffect(() => {
        const unsubscribe = db.collection('messages').orderBy('timestamp', 'desc').limit(PAGE_SIZE).onSnapshot((snapshot) => {
            const newMessages = snapshot.docs.map((doc) => ({
                id: doc.id,
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
                (snapshot) => { },
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
        handleRemoveImage();
    };

    //image
    const handlePaste = (e) => {
        const clipboardData = e.clipboardData || window.clipboardData;
        const items = clipboardData.items;

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

    const handleRemoveImage = () => {
        const obj = document.getElementById('f');
        obj.value = '';
        setImage(null);
    };

    const MessageList = ({ messages }) => {
        if (!messages || messages.length === 0) {
            return <div>メッセージがありません。</div>;
        }

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
                                <Linkify
                                    componentDecorator={(decoratedHref, decoratedText, key) => (
                                        <a target="blank" href={decoratedHref} key={key}>
                                            {decoratedText}
                                        </a>
                                    )}
                                >
                                    {message.text}
                                </Linkify>

                            )}
                            <span className="timestamp">{formatTimestamp(message.timestamp)}</span>
                        </div>
                    </div>
                ))}
                <Pagination
                    currentPage={currentPage}
                    totalPages={totalPages}
                    onNextPage={handleNextPage}
                    onPrevPage={handlePrevPage}
                />
            </div>
        );
    };

    const Pagination = ({ currentPage, totalPages, onNextPage, onPrevPage }) => {
        return (
            <div>
                <button onClick={onPrevPage} disabled={currentPage === 0}>Previous</button>
                <span>{currentPage + 1}/{totalPages}</span>
                <button onClick={onNextPage} disabled={currentPage === totalPages - 1}>Next</button>
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
                            className="input-field"
                            type="text"
                            placeholder="ユーザ名"
                            value={username}
                            onChange={(e) => setUsername(e.target.value)}
                        />
                        <input
                            className="input-field"
                            type="password"
                            placeholder="パスワード"
                            value={password}
                            onChange={(e) => setPassword(e.target.value)}
                        />
                        <br />
                        <button className="button-field-login" type="submit">ログイン</button>
                    </form>
                </div>
            ) : (
                <div>
                    <h1>チャット</h1>
                    <form onSubmit={sendMessage}>
                        <input
                            className="input-field"
                            type="text"
                            placeholder="メッセージを入力 or 画像を貼り付け"
                            value={message}
                            onChange={(e) => setMessage(e.target.value)}
                            onPaste={handlePaste}
                        />
                        <button className="button-field" type="submit">送信</button>
                        <button className="button-field" type="button" onClick={toggleNotification}>
                            {isNotificationEnabled ? (<FaBell />) : (<FaBellSlash />)}
                        </button>
                        <br />
                        {image && (
                            <div>
                                <img src={URL.createObjectURL(image)} alt="Preview" style={{ maxWidth: '200px' }} />
                                <button type="button" onClick={handleRemoveImage}>
                                    &times;
                                </button>
                            </div>
                        )}
                        <input
                            className="input-field-file"
                            id="f"
                            type="file"
                            accept="image/*"
                            onChange={handleImageUpload}
                        />
                    </form>
                    <div>
                        <MessageList messages={messages} />
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