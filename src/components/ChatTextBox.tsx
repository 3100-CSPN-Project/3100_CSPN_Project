// shows one posted comment in the live chat column
export default function ChatTextBox({
  author,
  body,
}: {
  author: string;
  body: string;
}) {
  return (
    <div className="textBox">
      <strong>
        <p>{author}</p>
      </strong>
      <p>{body}</p>
    </div>
  );
}
