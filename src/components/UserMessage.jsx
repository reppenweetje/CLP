export default function UserMessage({ children }) {
  return (
    <div className="flex justify-end fade-up">
      <div className="max-w-[78%] min-w-0">
        <div className="rounded-3xl rounded-tr-md bg-midnite text-paper px-4 py-2.5 text-[14px] leading-relaxed">
          {children}
        </div>
      </div>
    </div>
  )
}
