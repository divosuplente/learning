---
title: Kafka API Quick Reference
description: Producer, Consumer, and Streams API essentials.
---

## Core Concepts

| Concept | Description |
|---|---|
| Topic | Named stream of records |
| Partition | Ordered, append-only log within a topic |
| Offset | Unique position of a record within a partition |
| Consumer Group | Group of consumers sharing topic partitions |
| Key | Optional record key used for partition routing |

## Producer API

```java
Properties props = new Properties();
props.put("bootstrap.servers", "localhost:9092");
props.put("key.serializer",   "org.apache.kafka.common.serialization.StringSerializer");
props.put("value.serializer", "org.apache.kafka.common.serialization.StringSerializer");

KafkaProducer<String, String> producer = new KafkaProducer<>(props);

ProducerRecord<String, String> record =
    new ProducerRecord<>("my-topic", "key", "value");
producer.send(record, (metadata, ex) -> {
    if (ex != null) ex.printStackTrace();
    else System.out.println(metadata.offset());
});

producer.close();
```

### Producer Config

| Property | Value | Why |
|---|---|---|
| `acks` | `all` | Wait for all ISR replicas — strongest durability |
| `retries` | `3` | Auto-retry transient failures |
| `enable.idempotence` | `true` | Prevent duplicates on retries |

## Consumer API

```java
Properties props = new Properties();
props.put("bootstrap.servers", "localhost:9092");
props.put("group.id",          "my-group");
props.put("key.deserializer",  "org.apache.kafka.common.serialization.StringDeserializer");
props.put("value.deserializer","org.apache.kafka.common.serialization.StringDeserializer");

KafkaConsumer<String, String> consumer = new KafkaConsumer<>(props);
consumer.subscribe(List.of("my-topic"));

while (true) {
    ConsumerRecords<String, String> records = consumer.poll(Duration.ofMillis(1000));
    for (ConsumerRecord<String, String> r : records) {
        System.out.printf("offset=%d key=%s value=%s%n", r.offset(), r.key(), r.value());
    }
}
```

### Consumer Config

| Property | Value | Why |
|---|---|---|
| `group.id` | unique string | Identifies the consumer group |
| `auto.offset.reset` | `earliest` | Read from start when no offset committed |
| `enable.auto.commit` | `true` | Auto-commit offsets (set `false` for manual) |

## Spring Kafka

```java
@KafkaListener(topics = "my-topic", groupId = "my-group")
public void listen(String message) {
    System.out.println("Received: " + message);
}
```

```yaml
spring:
  kafka:
    bootstrap-servers: localhost:9092
    consumer:
      group-id: my-group
      auto-offset-reset: earliest
```
