from __future__ import annotations

import argparse
import json
from pathlib import Path
from typing import List

from datasets import Dataset
from transformers import (
    AutoModelForSeq2SeqLM,
    AutoTokenizer,
    DataCollatorForSeq2Seq,
    Seq2SeqTrainer,
    Seq2SeqTrainingArguments,
)


def load_pairs(path: Path) -> List[dict]:
    rows: List[dict] = []
    with path.open('r', encoding='utf-8') as handle:
        for line in handle:
            line = line.strip()
            if not line:
                continue
            item = json.loads(line)
            input_text = item['input']
            output_payload = item['output']
            if not isinstance(output_payload, str):
                output_payload = json.dumps(output_payload, ensure_ascii=True)
            rows.append(
                {
                    'input_text': f'convert to prescription json: {input_text}',
                    'target_text': output_payload,
                }
            )
    return rows


def main() -> None:
    parser = argparse.ArgumentParser(description='Fine-tune T5 for prescription JSON generation')
    parser.add_argument('--train-file', required=True, help='Path to JSONL with input/output pairs')
    parser.add_argument('--model-name', default='google/flan-t5-base')
    parser.add_argument('--output-dir', default='models/prescription-t5')
    parser.add_argument('--epochs', type=int, default=3)
    parser.add_argument('--batch-size', type=int, default=4)
    parser.add_argument('--learning-rate', type=float, default=3e-5)
    args = parser.parse_args()

    train_rows = load_pairs(Path(args.train_file))
    dataset = Dataset.from_list(train_rows)

    tokenizer = AutoTokenizer.from_pretrained(args.model_name)
    model = AutoModelForSeq2SeqLM.from_pretrained(args.model_name)

    def tokenize_batch(batch):
        model_inputs = tokenizer(
            batch['input_text'],
            max_length=1024,
            truncation=True,
        )
        labels = tokenizer(
            text_target=batch['target_text'],
            max_length=512,
            truncation=True,
        )
        model_inputs['labels'] = labels['input_ids']
        return model_inputs

    tokenized = dataset.map(tokenize_batch, batched=True, remove_columns=dataset.column_names)

    training_args = Seq2SeqTrainingArguments(
        output_dir=args.output_dir,
        learning_rate=args.learning_rate,
        per_device_train_batch_size=args.batch_size,
        num_train_epochs=args.epochs,
        logging_steps=20,
        save_strategy='epoch',
        fp16=False,
        report_to='none',
    )

    trainer = Seq2SeqTrainer(
        model=model,
        args=training_args,
        train_dataset=tokenized,
        tokenizer=tokenizer,
        data_collator=DataCollatorForSeq2Seq(tokenizer, model=model),
    )

    trainer.train()
    trainer.save_model(args.output_dir)
    tokenizer.save_pretrained(args.output_dir)


if __name__ == '__main__':
    main()
