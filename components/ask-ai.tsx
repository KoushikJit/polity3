"use client";
import React, { useState } from "react";
import { Button } from "./ui/button";
import axios from "axios";
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover";
import {
  BookUp,
  Bot,
  Lightbulb,
  MenuIcon,
  MenuSquare,
  PawPrint,
  PawPrintIcon,
  Search,
} from "lucide-react";
import { Separator } from "./ui/separator";
import { Input } from "./ui/input";

type Props = {};

const AskAiComponent = (props: Props) => {
  //state
  const [question, setQuestion] = useState("");
  const [answer, setAnswer] = useState("");

  return (
    <div className="flex flex-col gap-2 w-full relative">
      <div className="flex items-center gap-2">
        <Search className="fixed w-4 h-4 ml-2"/>
        <Input
          placeholder="start typing..." className="pl-8"
          onChange={(e) => {
            setQuestion(e.target.value);
          }}
        />
        <Button onClick={askAi} className="bg-primary">
          Ask AI <Bot className="pl-2" />
        </Button>
        <PopoverSection />
      </div>
      <section>{answer}</section>
    </div>
  );

  //handler functions
  async function updateVectors() {
    const response = await axios.post("api/setup", { question: "setup" });
    console.log(response.data);
  }

  async function askAi() {
    console.log("askAi");
    const response = await axios.post("api/read", { question: question });
    console.log(response.data);
    setAnswer(response.data);
  }
  // inner components
  function PopoverSection() {
    return (
      <Popover>
        <PopoverTrigger>
          <MenuSquare />
        </PopoverTrigger>
        <PopoverContent className="w-auto">
          <span className="flex items-center justify-center text-xs text-muted-foreground">
            <BookUp className="p-1" /> Pinecone
          </span>
          <Separator className="my-2" />
          <Button
            variant={"default"}
            className="w-full"
            onClick={updateVectors}
          >
            Update DB
          </Button>
        </PopoverContent>
      </Popover>
    );
  }
};

export default AskAiComponent;
