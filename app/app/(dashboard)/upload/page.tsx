import Form from 'next/form'
export default function UploadPage() {
  return (
    <div>
      <h1 className="text-3xl font-bold">Upload</h1>
      <p>Upload your latest video and share it with the world!</p>
      <Form action="/videos">
        
      </Form>
    </div>
  );
}
